import { Head } from "$fresh/runtime.ts";
import { Testcases } from "../compiler/compiler.ts";
import Editor from "../islands/Editor.tsx";
import * as yaml from "yaml/yaml/mod.ts";

export default function Home() {
  const data = Deno.readTextFileSync('./features/goods.yaml')
  return (
    <>
      <Head>
        <title>Fresh App</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <Editor start={yaml.parse(data) as Testcases} />
      </div>
    </>
  );
}
