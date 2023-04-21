import { useState } from "preact/hooks";
import * as yaml from "yaml/yaml/mod.ts";
import type { Testcases } from "../compiler/compiler.ts";

interface EditorProps {
  start: Testcases;
}

export default function Editor(props: EditorProps) {
  const [state, setState] = useState(props.start);
  return (
    <div class="flex gap-2 w-full">
      <textarea
        readonly
        value={yaml.stringify({
          ["로그인하지 않았으면 장바구니에 담을 수 없다"]:
            state["로그인하지 않았으면 장바구니에 담을 수 없다"],
        })}
        className="w-1/2 h-screen"
      />
      <ul className="w-full">
        <li>
          버튼
          <button
            className="border-2 p-2 rounded-lg bg-red-600 text-white"
            onClick={() => {
              setState((old) => ({
                "로그인하지 않았으면 장바구니에 담을 수 없다": old[
                  "로그인하지 않았으면 장바구니에 담을 수 없다"
                ].concat([{ 클릭: "test" }]),
              }));
            }}
          >
            클릭
          </button>
        </li>
        <li>
          체크박스
          <button
            className="border-2 p-2 rounded-lg bg-red-600 text-white"
            onClick={() => {
              setState((old) => ({
                "로그인하지 않았으면 장바구니에 담을 수 없다": old[
                  "로그인하지 않았으면 장바구니에 담을 수 없다"
                ].concat([{ 클릭: { 체크박스: 'test' } }]),
              }));
            }}
          >
            클릭
          </button>
        </li>
      </ul>
    </div>
  );
}
