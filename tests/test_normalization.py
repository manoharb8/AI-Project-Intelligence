from rag_pipeline.normalization import normalize_text


def test_normalize_collapses_whitespace():
    raw = "Hello    world\t\tthis   is  messy"
    assert normalize_text(raw) == "Hello world this is messy"


def test_normalize_removes_blank_lines_and_crlf():
    raw = "Line one\r\n\r\n\r\nLine two\r\n   \r\nLine three"
    result = normalize_text(raw)
    assert "\n\n\n" not in result
    assert "Line one" in result
    assert "Line two" in result
    assert "Line three" in result


def test_normalize_empty_input():
    assert normalize_text("") == ""
    assert normalize_text(None) == ""


def test_normalize_strips_line_whitespace():
    raw = "   leading and trailing   \n   another line   "
    result = normalize_text(raw)
    for line in result.split("\n"):
        assert line == line.strip()
