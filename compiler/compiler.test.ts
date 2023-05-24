import * as yaml from "yaml/yaml/mod.ts";
import { assertEquals, assertThrows } from "testing/asserts.ts";
import { Testcases, compileAction, compileTestcases } from "./compiler.ts";

Deno.test("페이지로 이동하는데, 상수를 이용할 수  있다", () => {
    assertEquals(
        compileAction({ 페이지여야한다: "일체형_상품_이채연" }),
        "await expect(page).toHaveURL(/.*\\/goods/220/);"
    );
});

Deno.test("상수가 정의되어 있지 않으면 에러를 던진다", () => {
    assertThrows(() => compileAction({ 페이지여야한다: "정의되지 않은 상수" }));
});

Deno.test("버튼 요소를 정의하고 이용할 수 있다", () => {
    assertEquals(
        compileAction({ $: { 버튼: "확인" } }),
        "const 확인_버튼 = page.getByRole('button', { name: '확인' });"
    );

    assertEquals(
        compileAction({ 클릭: "$확인_버튼" }),
        "await 확인_버튼.click();"
    );
});

Deno.test("api 요청의 결과를 모킹할 수 있다", () => {
    assertEquals(
        compileAction({ 서버: { path: '/auth/signup', code: '200', data: '{ "token": "test" }' } }),
        "await page.route(HOST+'/auth/signup', (route, request) => route.fulfill({ json: { code: 200, data: { \"token\": \"test\" } } }));"
    );
});

Deno.test("api 요청 코드에 커스텀한 js를 사용할 수 있다", () => {
    assertEquals(
        compileAction({ 서버: { path: '/auth/signup', code: 'request.postDataJSON().code === \"123456\" ? 200 : 400', data: '{ "token": "test" }' } }),
        "await page.route(HOST+'/auth/signup', (route, request) => route.fulfill({ json: { code: request.postDataJSON().code === \"123456\" ? 200 : 400, data: { \"token\": \"test\" } } }));"
    );
});

Deno.test("체크박스 요소를 정의할 수 있다", () => {
    assertEquals(
        compileAction({ $: { 체크박스: "전체동의" } }),
        "const 전체동의_체크박스 = page.getByRole('checkbox', { name: '전체동의' });"
    );
});

Deno.test("링크 요소를 정의할 수 있다", () => {
    assertEquals(
        compileAction({ $: { 링크: "이용약관" } }),
        "const 이용약관_링크 = page.getByRole('link', { name: '이용약관' });"
    );
});

Deno.test("섹션의 서브 액션을 정의할 수 있다", () => {
    assertEquals(
        compileAction({ 섹션: "가입약관", 안에서: [{ 클릭: '전체동의' }] }),
        "const 가입약관_섹션 = page.getByRole('section', { name: '가입약관' });\n    await 가입약관_섹션.getByRole('button', { name: '전체동의' }).click();"
    );
});

const 결과 = `import { type Locator, type Page, expect, test } from '@playwright/test';

test('이메일 주소 불일치', async ({ page }) => {
    await page.goto('http://localhost:3000/signin');

    const 로그인_폼 = page.getByRole('form', { name: '로그인' });
    await 로그인_폼.getByRole('textbox', { name: '이메일' }).fill('not-found@wonderwall.kr');
    await 로그인_폼.getByRole('textbox', { name: '비밀번호' }).fill('wonderwall2@');
    await 로그인_폼.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByRole('alert').filter({ hasText: '이메일 주소를 찾을 수 없습니다.' })).toBeVisible();
});
`

Deno.test("테스트케이스를 컴파일", () => {
    assertEquals(
        compileTestcases({
            "이메일 주소 불일치": [
                { "페이지로 이동": "로그인" },
                {
                    폼: "로그인",
                    안에서: [
                        { 입력: { 라벨: "이메일", 값: "not-found@wonderwall.kr" } },
                        { 입력: { 라벨: "비밀번호", 값: "wonderwall2@" } },
                        { 클릭: '로그인' }
                    ]
                },
                { 보인다: { 경고: '이메일 주소를 찾을 수 없습니다.' } }
            ]
        }),
        결과
    );
})

const 회원가입_YAML = `필수 약관에 동의해야만 다음 단계로 넘어갈 수 있다:
  - 페이지로 이동: 회원가입
  - 섹션: 가입약관
    안에서:
      - 비활성화된다: 확인

      - 체크: 이용약관

      - 비활성화된다: 확인
      - 체크: 개인정보처리방침
      - 클릭: 확인
`

const 회원가입_결과 = `import { type Locator, type Page, expect, test } from '@playwright/test';

test('필수 약관에 동의해야만 다음 단계로 넘어갈 수 있다', async ({ page }) => {
    await page.goto('http://localhost:3000/signup');

    const 가입약관_섹션 = page.getByRole('section', { name: '가입약관' });
    await expect(가입약관_섹션.getByRole('button', { name: '확인' })).toBeDisabled();
    await 가입약관_섹션.getByRole('checkbox', { name: '이용약관' }).click();
    await expect(가입약관_섹션.getByRole('button', { name: '확인' })).toBeDisabled();
    await 가입약관_섹션.getByRole('checkbox', { name: '개인정보처리방침' }).click();
    await 가입약관_섹션.getByRole('button', { name: '확인' }).click();
});
`

Deno.test("회원가입 케이스 컴파일", () => {
    assertEquals(
        compileTestcases(yaml.parse(회원가입_YAML) as Testcases),
        회원가입_결과
    );
})