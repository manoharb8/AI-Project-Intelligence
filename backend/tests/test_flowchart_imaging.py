import io
import pytest
from PIL import Image, ImageStat
from app.flowchart.imaging import ImageProblem, detect_kind, prepare_image, prepare_pil, render_pdf
from flowchart_support import fixture


def brightness(data):
    return ImageStat.Stat(Image.open(io.BytesIO(data)).convert('L')).mean[0]


def test_detects_type_from_content_not_name():
    assert detect_kind(fixture('order_flow.png')) == 'png'
    assert detect_kind(fixture('order_flow.pdf')) == 'pdf'
    assert detect_kind(fixture('fake.png')) is None


def test_transparent_png_is_flattened_onto_white_not_black():
    raw = fixture('order_flow_transparent.png')
    naive = io.BytesIO(); Image.open(io.BytesIO(raw)).convert('RGB').save(naive, 'PNG')
    assert brightness(naive.getvalue()) < 5
    prepared = prepare_image(raw)
    assert brightness(prepared.data) > 230
    assert any('Transparent' in note for note in prepared.notes)


def test_light_artwork_on_transparent_background_is_placed_on_dark():
    img = Image.new('RGBA', (800, 600), (0, 0, 0, 0))
    for x in range(100, 700):
        for y in (200, 201, 202, 400, 401, 402):
            img.putpixel((x, y), (250, 250, 250, 255))
    assert brightness(prepare_pil(img).data) < 60


@pytest.mark.parametrize('mode', ['P', 'L', 'LA', 'CMYK', '1', 'I;16'])
def test_unusual_png_modes_are_converted(mode):
    base = Image.new('L', (800, 600), 255)
    for x in range(100, 700):
        base.putpixel((x, 300), 0)
    img = base.convert(mode) if mode != 'I;16' else base.convert('I').point(lambda v: v * 257).convert('I;16')
    out = Image.open(io.BytesIO(prepare_pil(img).data))
    assert out.mode == 'RGB' and out.size[0] >= 700


def test_large_images_are_downscaled_and_tiny_ones_upscaled():
    big = Image.new('RGB', (4000, 3000), 'white'); big.paste((0, 0, 0), (100, 100, 3900, 140))
    assert max(prepare_pil(big, 1568).width, prepare_pil(big, 1568).height) == 1568
    small = Image.new('RGB', (300, 200), 'white'); small.paste((0, 0, 0), (20, 20, 280, 40))
    assert prepare_pil(small).width == 600


@pytest.mark.parametrize('name,fragment', [('blank.png', 'blank'), ('corrupt.png', 'could not be read')])
def test_unusable_images_give_a_clear_reason(name, fragment):
    with pytest.raises(ImageProblem, match=fragment):
        prepare_image(fixture(name))


def test_too_small_and_pixel_bomb_are_rejected():
    tiny = io.BytesIO(); Image.new('RGB', (30, 30), 'white').save(tiny, 'PNG')
    with pytest.raises(ImageProblem, match='too small'):
        prepare_image(tiny.getvalue())
    bomb = io.BytesIO(); Image.new('1', (9000, 9000), 1).save(bomb, 'PNG')
    with pytest.raises(ImageProblem, match='too large'):
        prepare_image(bomb.getvalue())


def test_pdf_pages_render_and_page_limit_is_reported():
    pages, total = render_pdf(fixture('order_flow.pdf'))
    assert total == 1 and len(pages) == 1 and pages[0].size[0] >= 700
    prepared = prepare_pil(pages[0])
    assert brightness(prepared.data) > 200


def test_broken_pdf_is_a_clear_error():
    with pytest.raises(ImageProblem, match='PDF could not be read'):
        render_pdf(b'%PDF-1.4 not really a pdf')
