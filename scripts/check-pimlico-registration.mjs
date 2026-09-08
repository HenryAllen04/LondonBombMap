import { readFile, writeFile } from 'node:fs/promises';
import { evaluateRegistration } from '../lib/registration.js';
const path=process.argv[2]??new URL('../data/pimlico-registration.json',import.meta.url);
try {
  const result=evaluateRegistration(JSON.parse(await readFile(path,'utf8')));
  await writeFile(new URL('../public/proto/london-island/registration-check.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} catch(error) {console.error(error.message);process.exitCode=1;}
