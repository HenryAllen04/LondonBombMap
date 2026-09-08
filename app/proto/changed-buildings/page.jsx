import Harness from './harness';
export default async function Page({searchParams}) {
  const value=Number((await searchParams).v);
  return <Harness initial={value>=1&&value<=3&&Number.isInteger(value)?value-1:0}/>;
}
