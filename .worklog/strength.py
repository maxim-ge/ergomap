# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Strength calibration for ergomap argument maps.

A thesis's strength is its step's strength times the weakest of its premises and its implicit condition:
- a starting claim's strength is its rating
- a step's strength is fixed by its reasoning type
- a non-deductive step's implicit condition is rated like a starting claim and joins the premises
- a pool replaces its members in one step and counts as one premise; each member closes its share of
  the gap to a supported claim's number L: L * (1 - (1 - s1/L)(1 - s2/L)...), with each s at most L
- a flaw with no fix sets the thesis to 0

For each reported thesis the script prints its strength.

Usage: uv run .worklog/strength.py [inputs.json]
"""

from __future__ import annotations

import argparse
import io
import json
import sys
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, cast

STEP_TYPES = ("generalization", "abductive", "analogy")
ALL_STEP_TYPES = ("deductive", *STEP_TYPES)
CLAIM_RATINGS = ("strong", "weak", "none", "def")
CONDITION_RATINGS = ("weak", "none")
KEY_POINTS_MAX = 7


class InputError(Exception):
    """The inputs file or a map doesn't have the expected shape."""


# ---- typed access to parsed JSON


def as_dict(value: Any, where: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise InputError(f"{where}: expected an object")
    items = cast("dict[Any, Any]", value)
    return {str(k): v for k, v in items.items()}


def as_list(value: Any, where: str) -> list[Any]:
    if not isinstance(value, list):
        raise InputError(f"{where}: expected a list")
    return cast("list[Any]", value)


def as_str(value: Any, where: str) -> str:
    if not isinstance(value, str):
        raise InputError(f"{where}: expected a string")
    return value


def as_number(value: Any, where: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise InputError(f"{where}: expected a number")
    return float(value)


def as_id(value: Any, where: str) -> str:
    """Thesis ids are integers or slugs; internally they are keyed by their string form."""
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        raise InputError(f"{where}: expected a thesis id")
    return str(value)


def read_json(path: Path) -> Any:
    data: Any = json.loads(path.read_text(encoding="utf-8"))
    return data


# ---- inputs


@dataclass(frozen=True)
class Numbers:
    ratings: dict[str, float]
    step_strength: dict[str, float]


@dataclass(frozen=True)
class Pool:
    key: str
    step: str
    members: tuple[str, ...]


@dataclass(frozen=True)
class MapInputs:
    name: str
    map_path: Path
    step_types: dict[str, str]
    claim_ratings: dict[str, str]
    condition_ratings: dict[str, str]
    pools: tuple[Pool, ...]
    flaws: frozenset[str]
    other: tuple[str, ...]


def number_table(raw: Any, where: str, required: Iterable[str]) -> dict[str, float]:
    table = {k: as_number(v, f"{where}.{k}") for k, v in as_dict(raw, where).items()}
    for name in required:
        if name not in table:
            raise InputError(f"{where}: missing {name}")
    return table


def parse_numbers(raw: Any) -> Numbers:
    data = as_dict(raw, "numbers")
    return Numbers(
        ratings=number_table(data.get("ratings"), "numbers.ratings", CLAIM_RATINGS),
        step_strength=number_table(data.get("stepStrength"), "numbers.stepStrength", ALL_STEP_TYPES),
    )


def parse_groups(raw: Any, where: str, allowed: tuple[str, ...]) -> dict[str, str]:
    """Turns {"weak": [1, 6], "def": [3]} into {"1": "weak", "6": "weak", "3": "def"}."""
    if raw is None:
        return {}
    result: dict[str, str] = {}
    for group, ids in as_dict(raw, where).items():
        if group not in allowed:
            raise InputError(f"{where}: unknown group {group!r}, expected one of {', '.join(allowed)}")
        for item in as_list(ids, f"{where}.{group}"):
            result[as_id(item, f"{where}.{group}")] = group
    return result


def parse_ids(raw: Any, where: str) -> list[str]:
    if raw is None:
        return []
    return [as_id(item, where) for item in as_list(raw, where)]


def parse_pool(raw: Any, where: str) -> Pool:
    data = as_dict(raw, where)
    return Pool(
        key=as_str(data.get("id"), f"{where}.id"),
        step=as_id(data.get("step"), f"{where}.step"),
        members=tuple(parse_ids(data.get("members"), f"{where}.members")),
    )


def parse_map_inputs(raw: Any, where: str, base: Path) -> MapInputs:
    data = as_dict(raw, where)
    return MapInputs(
        name=as_str(data.get("name"), f"{where}.name"),
        map_path=(base / as_str(data.get("map"), f"{where}.map")).resolve(),
        step_types=parse_groups(data.get("steps"), f"{where}.steps", STEP_TYPES),
        claim_ratings=parse_groups(data.get("startingClaims"), f"{where}.startingClaims", CLAIM_RATINGS),
        condition_ratings=parse_groups(data.get("conditions"), f"{where}.conditions", CONDITION_RATINGS),
        pools=tuple(parse_pool(p, f"{where}.pools[{i}]") for i, p in enumerate(as_list(data.get("pools", []), f"{where}.pools"))),
        flaws=frozenset(parse_ids(data.get("flaws"), f"{where}.flaws")),
        other=tuple(parse_ids(data.get("other"), f"{where}.other")),
    )


# ---- map


@dataclass(frozen=True)
class ArgumentMap:
    order: tuple[str, ...]
    labels: dict[str, str]
    premises: dict[str, tuple[str, ...]]


def load_map(path: Path) -> ArgumentMap:
    data = as_dict(read_json(path), str(path))
    order: list[str] = []
    labels: dict[str, str] = {}
    premises: dict[str, tuple[str, ...]] = {}
    for i, raw in enumerate(as_list(data.get("theses"), f"{path}: theses")):
        where = f"{path}: theses[{i}]"
        thesis = as_dict(raw, where)
        key = as_id(thesis.get("id"), f"{where}.id")
        order.append(key)
        labels[key] = as_str(thesis.get("label"), f"{where}.label").replace("\n", " ")
        premises[key] = tuple(parse_ids(thesis.get("from"), f"{where}.from"))
    return ArgumentMap(tuple(order), labels, premises)


def closure(start: str, step: Callable[[str], Iterable[str]]) -> set[str]:
    seen: set[str] = set()
    stack = list(step(start))
    while stack:
        key = stack.pop()
        if key not in seen:
            seen.add(key)
            stack.extend(step(key))
    return seen


# ---- analysis


class Analysis:
    def __init__(self, arg_map: ArgumentMap, inputs: MapInputs, numbers: Numbers) -> None:
        self.map = arg_map
        self.inputs = inputs
        self.numbers = numbers
        self.pools = {pool.key: pool for pool in inputs.pools}
        self.premises = dict(arg_map.premises)
        for pool in inputs.pools:
            self._apply_pool(pool)
        self._check()
        self._memo: dict[str, float] = {}

    def _apply_pool(self, pool: Pool) -> None:
        if pool.key in self.premises:
            raise InputError(f"{self.inputs.name}: pool id {pool.key!r} clashes with a thesis id")
        step = self.premises.get(pool.step)
        if step is None:
            raise InputError(f"{self.inputs.name}: pool {pool.key}: unknown step {pool.step}")
        missing = [m for m in pool.members if m not in step]
        if missing:
            raise InputError(f"{self.inputs.name}: pool {pool.key}: {', '.join(missing)} are not premises of {pool.step}")
        self.premises[pool.step] = tuple(p for p in step if p not in pool.members) + (pool.key,)
        self.premises[pool.key] = pool.members

    def _check(self) -> None:
        name = self.inputs.name
        for key, premises in self.premises.items():
            for premise in premises:
                if premise not in self.premises:
                    raise InputError(f"{name}: {key} refers to missing thesis {premise}")
        for key in self.inputs.step_types:
            if not self.map.premises.get(key):
                raise InputError(f"{name}: step type given for {key}, which isn't a conclusion")
        for key in self.inputs.claim_ratings:
            if key not in self.map.premises or self.map.premises[key]:
                raise InputError(f"{name}: rating given for {key}, which isn't a starting claim")
        for key in self.inputs.condition_ratings:
            if self.step_type(key) == "deductive":
                raise InputError(f"{name}: condition given for {key}, which isn't a non-deductive step")
        for key in [*self.inputs.flaws, *self.inputs.other]:
            if key not in self.map.premises:
                raise InputError(f"{name}: unknown thesis {key}")

    def step_type(self, key: str) -> str:
        return self.inputs.step_types.get(key, "deductive")

    def rating(self, key: str) -> str:
        return self.inputs.claim_ratings.get(key, "strong")

    def step_strength(self, key: str) -> float:
        return self.numbers.step_strength[self.step_type(key)]

    def pool_strength(self, pool: Pool) -> float:
        """Each member closes its share of the gap that remains to a supported claim's number."""
        limit = self.numbers.ratings["strong"]
        gap = 1.0
        for member in pool.members:
            gap *= 1 - min(self.strength(member), limit) / limit
        return limit * (1 - gap)

    def strength(self, key: str) -> float:
        cached = self._memo.get(key)
        if cached is not None:
            return cached
        premises = self.premises[key]
        pool = self.pools.get(key)
        if pool is not None:
            value = self.pool_strength(pool)
        elif not premises:
            value = self.numbers.ratings[self.rating(key)]
        elif key in self.inputs.flaws:
            value = 0.0
        else:
            parts = [self.strength(p) for p in premises]
            if self.step_type(key) != "deductive":
                parts.append(self.numbers.ratings[self.inputs.condition_ratings.get(key, "strong")])
            value = self.step_strength(key) * min(parts)
        self._memo[key] = value
        return value

    def final_conclusions(self) -> list[str]:
        children = self._children()
        return [k for k in self.map.order if self.map.premises[k] and not children[k]]

    def key_point_ranking(self) -> tuple[list[tuple[str, int]], int | None]:
        """Conclusions with consequences, by theses behind x theses depending on, cut where the score halves."""
        children = self._children()
        scored: list[tuple[str, int]] = []
        for key in self.map.order:
            if self.map.premises[key] and children[key]:
                behind = closure(key, lambda k: self.map.premises[k])
                ahead = closure(key, lambda k: children[k])
                scored.append((key, len(behind) * len(ahead)))
        scored.sort(key=lambda item: -item[1])
        chosen: list[tuple[str, int]] = []
        for key, score in scored:
            if len(chosen) == KEY_POINTS_MAX or (chosen and score < chosen[-1][1] / 2):
                return chosen, score
            chosen.append((key, score))
        return chosen, None

    def _children(self) -> dict[str, list[str]]:
        children: dict[str, list[str]] = {k: [] for k in self.map.order}
        for key, premises in self.map.premises.items():
            for premise in premises:
                children[premise].append(key)
        return children


# ---- report


def fmt(value: float) -> str:
    """Two decimals, without rounding a nonzero value to 0 or a value below 1 to 1."""
    if 0 < value < 0.005:
        return "<0.01"
    if 0.995 <= value < 1:
        return ">0.99"
    return f"{value:.2f}"


def thesis_line(analysis: Analysis, key: str) -> str:
    return f"[{key}] {analysis.map.labels[key]}: {fmt(analysis.strength(key))}"


def report(analysis: Analysis) -> list[str]:
    finals = analysis.final_conclusions()
    ranking, cut = analysis.key_point_ranking()
    position = {k: i for i, k in enumerate(analysis.map.order)}
    key_points = sorted((k for k, _ in ranking), key=lambda k: position[k])
    scores = ", ".join(f"{k} ({s})" for k, s in ranking)
    lines = [f"- **{analysis.inputs.name}:**"]
    lines.append(f"  - Key point scores: {scores}" + (f"; cut before {cut}" if cut is not None else ""))
    lines.append("  - Final conclusion:" if len(finals) == 1 else "  - Final conclusions:")
    lines += [f"    - {thesis_line(analysis, k)}" for k in finals]
    lines.append("  - Key points:")
    lines += [f"    - {thesis_line(analysis, k)}" for k in key_points]
    if analysis.inputs.other:
        lines.append("  - Other theses:")
        lines += [f"    - {thesis_line(analysis, k)}" for k in analysis.inputs.other]
    return lines


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if isinstance(stream, io.TextIOWrapper):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Compute thesis strength for ergomap argument maps.")
    parser.add_argument("inputs", nargs="?", default=str(Path(__file__).with_name("strength-inputs.json")),
                        help="inputs file (default: strength-inputs.json next to this script)")
    args = parser.parse_args()
    try:
        inputs_path = Path(as_str(args.inputs, "inputs")).resolve()
        data = as_dict(read_json(inputs_path), str(inputs_path))
        numbers = parse_numbers(data.get("numbers"))
        lines: list[str] = []
        for i, raw in enumerate(as_list(data.get("maps"), "maps")):
            inputs = parse_map_inputs(raw, f"maps[{i}]", inputs_path.parent)
            lines += report(Analysis(load_map(inputs.map_path), inputs, numbers))
    except (InputError, OSError, json.JSONDecodeError) as err:
        print(f"error: {err}", file=sys.stderr)
        return 1
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
