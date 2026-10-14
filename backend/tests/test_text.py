from pathlib import Path
import pytest
from app.services.text import normalize, chunks, extract
from app.core.config import CHUNK_WORDS, CHUNK_OVERLAP

SAMPLES = Path(__file__).resolve().parents[2] / 'samples'

@pytest.mark.parametrize('name,expected', [('project_proposal.pdf','ticket'),('meeting_notes.docx','staging'),('task_list.csv','Priya'),('sprint_update.txt','Schedule risks')])
def test_all_formats_extract_with_provenance(name,expected):
    units=extract((SAMPLES/name).read_bytes(),name.rsplit('.',1)[1])
    assert any(expected in u.text for u in units)
    assert all(u.location and u.text for u in units)

def test_docx_tables_are_extracted():
    assert any('SMTP credentials missing' in u.text and 'Table' in u.location for u in extract((SAMPLES/'meeting_notes.docx').read_bytes(),'docx'))

def test_csv_retains_header_meaning():
    units=extract((SAMPLES/'task_list.csv').read_bytes(),'csv')
    assert 'Owner: Priya' in units[0].text
    assert 'Status: In progress' in units[0].text

def test_normalization():
    assert normalize('ＡＰＩ\x00\t work\r\n  is   pending')=='API work is pending'

@pytest.mark.parametrize('text', ['', '   \n\t', '\x00'])
def test_empty_chunks(text):
    assert chunks(text)==[]

@pytest.mark.parametrize('count', [1,179,180,181,330,331,800])
def test_chunk_boundaries_and_complete_coverage(count):
    words=[f'w{i}' for i in range(count)]
    result=chunks(' '.join(words))
    assert all(0<len(x.split())<=CHUNK_WORDS for x in result)
    rebuilt=result[0].split()
    for previous,current in zip(result,result[1:]):
        assert previous.split()[-CHUNK_OVERLAP:]==current.split()[:CHUNK_OVERLAP]
        rebuilt.extend(current.split()[CHUNK_OVERLAP:])
    assert rebuilt==words

def test_long_single_token_and_unicode():
    text='Ω'*2000
    assert chunks(text)==[text]

@pytest.mark.parametrize('data,kind',[(b'','txt'),(b'\xff','txt'),(b'x','pdf'),(b'x','docx'),(b'a,b\n1,2,3','csv'),(b'a,a\n1,2','csv'),(b'hello','exe')])
def test_invalid_inputs_rejected(data,kind):
    with pytest.raises(Exception):extract(data,kind)
