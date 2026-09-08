"""Run with a Python environment containing overturemaps==1.0.2 (see docs)."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

parser=argparse.ArgumentParser()
parser.add_argument('--release',required=True,help='Explicit Overture release, e.g. 2026-08-19.0')
parser.add_argument('--from-directory',type=Path,help='Reuse completed CLI extracts from this directory')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
bbox=[-.151,51.4825,-.129,51.4955]
features=[]
hashes={}
capture_times=[]
with tempfile.TemporaryDirectory() as temp:
    for kind in ['building','building_part']:
        path=(args.from_directory or Path(temp))/f'pimlico-{kind}.geojson'
        if not args.from_directory:
            subprocess.run([str(Path(sys.executable).with_name('overturemaps')),'download','--bbox='+','.join(map(str,bbox)),
                '-r',args.release,'-f','geojson','--type='+kind,'-o',str(path),'--connect_timeout','15','--request_timeout','45'],check=True)
        state=json.loads(path.with_suffix(path.suffix+'.state').read_text())
        expected_bbox=dict(zip(['xmin','ymin','xmax','ymax'],bbox))
        if state['last_release']!=args.release or state['type']!=kind or state['bbox']!=expected_bbox:
            raise ValueError('CLI extract release, type or bounds do not match the requested capture')
        capture_times.append(state['last_run'])
        raw=path.read_bytes();hashes[kind]=hashlib.sha256(raw).hexdigest()
        data=json.loads(raw)
        if data.get('type')!='FeatureCollection':raise ValueError('Expected GeoJSON FeatureCollection')
        ids=set()
        for f in data['features']:
            if not isinstance(f.get('id'),str) or f['id'] in ids:raise ValueError('Missing or duplicate source ID')
            if f['geometry']['type'] not in ['Polygon','MultiPolygon']:raise ValueError('Expected polygon')
            ids.add(f['id'])
            f['properties'].update({'id':f['id'],'type':kind})
            features.append(f)
        print(kind,len(ids))
    result={'type':'FeatureCollection','provider':'Overture Maps Foundation','release':args.release,
        'captured':max(capture_times),'bbox':bbox,'source':'https://docs.overturemaps.org/guides/buildings/',
        'license':'ODbL-1.0','attribution':'© OpenStreetMap contributors, Overture Maps Foundation',
        'sourceHashes':hashes,'features':features}
    destination=root/'public/proto/london-island/pimlico-overture.json'
    pending=destination.with_suffix('.pending')
    pending.write_text(json.dumps(result,separators=(',',':'))+'\n');pending.replace(destination)
    print(destination)
