import Harness from "./harness";
export default async function Page({ searchParams }: { searchParams: Promise<{v?: string}> }) {
  const n = Number((await searchParams).v);
  return <Harness initial={Number.isInteger(n) && n >= 1 && n <= 4 ? n - 1 : 0} />;
}
