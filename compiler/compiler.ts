import * as yaml from "yaml/yaml/mod.ts";

const ClickableRoleDict = {
    버튼: 'button',
    링크: 'link',
    체크박스: 'checkbox',
}
type ClickableRole = keyof typeof ClickableRoleDict;

const ContainerRoleDict = {
    경고창: 'alertDialog',
    폼: 'form',
    목록: 'list',
    섹션: 'section',
}
type ContainerRole = keyof typeof ContainerRoleDict;
type Node<T extends string> = { [key in T]?: string };

export type Action =
    | { $: & Node<ClickableRole> }
    | { JS : string }
    | { 기다린다 : string | Node<ClickableRole> }
    | { 클릭 : string | Node<ClickableRole> }
    | { 서버 : { path: string, code?: string, data?: string } }
    | { 체크 : string }
    | { "페이지로 이동" : string }
    | { 페이지여야한다 : string }
    | { 입력 : { 라벨: string, 값: string } }
    | { 보인다 : string | { 경고: string } }
    | { 안보인다 : string | { 경고: string } }
    | { 활성화된다 : string }
    | { 비활성화된다 : string }
    | { 지움 : string }
    | { 비어있다 : string }
    | { 체크된다 : string }
    | { "체크되지 않는다" : string }
    | (Node<ContainerRole> & { 안에서: Action[]; })

export type Testcases = {
    [testname in string]: Action[]
}


const ConstantsYaml = Deno.readTextFileSync(`./Constants.yaml`);

const Constants = yaml.parse(ConstantsYaml) as Record<string, string | undefined>

const 상수 = (key: string) => {
    if (key in Constants) {
        return Constants[key]
    } else {
        throw Error(`상수가 정의되지 않았습니다: "${key}"`)
    }
}

const createCommand = (command: string) => (target: string) => command.replace('<target>', target);

const click = (클릭: string | Node<ClickableRole>, parent = 'page') => {
    if(typeof 클릭 === 'string' && 클릭.startsWith('$')){
        return `await ${클릭.slice(1)}.click()`
    }

    const role = typeof 클릭 === 'string' ? '버튼' : Object.keys(클릭)[0] as ClickableRole;
    const name = typeof 클릭 === 'string' ? 클릭 : 클릭[role];
    if (Object.keys(ClickableRoleDict).includes(role)){
        return `await ${parent}.getByRole('${ClickableRoleDict[role]}', { name: '${name}' }).click()`
    }
    throw Error(`아직 지원하지 않는 role 입니다. ${role}`);
}

const fill = ({ 라벨, 값 }: { 라벨: string, 값: string }, parent = 'page') => {
    return `await ${parent}.getByRole('textbox', { name: '${라벨}' }).fill('${값}')`
}

export function compileAction(action: Action, parent = 'page'): string {

    if ("$" in action){
        const key = Object.keys(action.$)[0] as ClickableRole;
        const name = action.$[key]!;
        const role = ClickableRoleDict[key]
        return `const ${name.replaceAll(' ', '_')}_${key} = ${parent}.getByRole('${role}', { name: '${name}' });`;
    }
    
    if ("JS" in action){
        return action.JS;
    }

    if ("서버" in action){
        const { path, code, data } = action.서버;
        return `await page.route(HOST+'${path}', (route, request) => route.fulfill({ json: { code: ${code ?? 200}, data: ${data ?? 'undefined'} } }));`;
    }

    if ("기다린다" in action){
        if(typeof action.기다린다 === 'string'){
            return `await ${parent}.getByText('${action.기다린다}').waitFor();`
        }
        const roleName = Object.keys(action.기다린다)[0] as ClickableRole;
        return `await ${parent}.getByRole('${ClickableRoleDict[roleName]}', { name: '${action.기다린다[roleName]}' }).waitFor();`
    }

    if ("페이지로 이동" in action){
        const path = 상수(action["페이지로 이동"]);
        if (!path){
            throw Error(`상수 ${action['페이지로 이동']}가 없습니다`)
        }
        return `await ${parent}.goto('http://localhost:3000${path}');`
    }

    if ("페이지여야한다" in action){
        const path = 상수(action['페이지여야한다']);
        if (!path){
            throw Error(`상수 ${action['페이지여야한다']}가 없습니다`)
        }
        return `await expect(page).toHaveURL(/.*\\${path}/);`
    }

    if ("클릭" in action){
        return click(action.클릭, parent) + ';';
    }
    if ("체크" in action){
        return click({ 체크박스: action.체크 }, parent) + ';';
    }

    if ("지움" in action){
        return `await ${parent}.getByLabel('${action.지움}').clear();`;
    }
    
    if ("비어있다" in action){
        return `await expect(${parent}.getByLabel('${action.비어있다}')).toBeEmpty();`;
    }

    if ("활성화된다" in action){
        return `await expect(${parent}.getByRole('button', { name: '${action.활성화된다}' })).not.toBeDisabled();`;
    }

    if ("비활성화된다" in action){
        if(typeof action['비활성화된다'] === 'string' && action['비활성화된다'].startsWith('$')){
            return `await expect(${action['비활성화된다'].slice(1)}).toBeDisabled();`;
        }
        return `await expect(${parent}.getByRole('button', { name: '${action.비활성화된다}' })).toBeDisabled();`;
    }

    if ("체크된다" in action){
        return `await expect(${parent}.getByRole('checkbox', { name: '${action.체크된다}' })).toBeChecked();`;
    }

    if ("체크되지 않는다" in action){
        return `await expect(${parent}.getByRole('checkbox', { name: '${action["체크되지 않는다"]}' })).not.toBeChecked();`;
    }

    const roleName = Object.keys(action)[0] as ContainerRole;
    const role = ContainerRoleDict[roleName];
    if (role && '안에서' in action){
        const parentId = `${action[roleName]!.replaceAll(' ', '_')}_${roleName}`;
        return `const ${parentId} = ${role === 'alertdialog' ? 'page' : parent}.getByRole('${role.toLowerCase()}', { name: '${action[roleName]}' });\n    ${action.안에서.map(subAction => compileAction(subAction, parentId)).join('\n    ')}`
    }

    if ("보인다" in action){
        const command = createCommand(`await expect(<target>).toBeVisible();`);
        if (typeof action.보인다 === 'string'){
            return command(`${parent}.getByText('${action.보인다}')`);
        }
        return command(`page.getByRole('alert').filter({ hasText: '${action.보인다.경고}' })`);
    }

    if ("안보인다" in action){
        const command = createCommand(`await expect(<target>).not.toBeVisible();`);
        if (typeof action.안보인다 === 'string'){
            return command(`${parent}.getByText('${action.안보인다}')`);
        }
        return command(`page.getByRole('alert').filter({ hasText: '${action.안보인다.경고}' })`);
    }

    if ("입력" in action){
        return fill(action.입력, parent) + ';';
    }

    throw Error(`아직 지원하지 않는 액션입니다. ${JSON.stringify(action)}`);
}

export function compileTestcase([label, actions]: [string, Action[]]){
    return `test('${label}', async ({ page }) => {\n${actions.map((action => '    ' + compileAction(action, 'page'))).join('\n\n')}\n});`
}

export function compileTestcases(body: Testcases){
    return `import { type Locator, type Page, expect, test } from '@playwright/test';\n\n` + Object.entries(body)
        .map(compileTestcase).join('\n\n') + '\n'
}
