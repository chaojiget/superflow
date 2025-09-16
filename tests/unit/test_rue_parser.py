import pytest

from packages.agents.rue_parser import RueParseError, RueParser


def test_rue_parser_extracts_core_fields():
    parser = RueParser()
    query = "帮我根据 examples/data/weekly.csv 生成周报，挑出浏览量最高的前5篇文章，输出 Markdown，总结关键洞察，预算控制在 0.5 美元内。"
    spec = parser.parse(query, data_path="examples/data/weekly.csv")
    srs = spec.to_dict()

    assert srs["goal"].startswith("生成")
    assert srs["inputs"]["csv_path"] == "examples/data/weekly.csv"
    assert srs["params"]["top_n"] == 5
    assert srs["params"]["score_by"] == "views"
    assert any("摘要" in item["then"] or "Summary" in item["then"] for item in srs["acceptance"])
    assert pytest.approx(srs["budget_usd"], rel=1e-4) == 0.5


def test_rue_parser_requires_description():
    parser = RueParser()
    with pytest.raises(RueParseError) as exc_info:
        parser.parse("", data_path="examples/data/weekly.csv")
    assert exc_info.value.kind == "insufficient"
    assert "query" in exc_info.value.missing


def test_rue_parser_applies_overrides():
    parser = RueParser()
    spec = parser.parse(
        "生成一份报告",
        data_path="examples/data/weekly.csv",
        overrides={
            "constraints": ["保持字段命名一致"],
            "params": {"top_n": 3},
            "acceptance": [
                {
                    "id": "AX",
                    "then": "生成额外的质量检查",
                }
            ],
            "budget_usd": 1.2,
        },
    )
    srs = spec.to_dict()
    assert "保持字段命名一致" in srs["constraints"]
    assert srs["params"]["top_n"] == 3
    assert any(item["id"] == "AX" for item in srs["acceptance"])
    assert pytest.approx(srs["budget_usd"], rel=1e-4) == 1.2
