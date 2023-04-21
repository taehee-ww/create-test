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
}
type ContainerRole = keyof typeof ContainerRoleDict;
type Node<T extends string> = { [key in T]?: string };

export type Action =
    | { JS : string }
    | { 기다린다 : string | Node<ClickableRole> }
    | { 클릭 : string | Node<ClickableRole> }
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
    | (Record<ContainerRole, string> & { 안에서: SubAction[]; })

export type SubAction =
    | { 클릭 : string | Node<ClickableRole> }
    | { 보인다 : string }
    | { 입력 : { 라벨: string, 값: string } }

export type Testcases = {
    [testname in string]: Action[]
}


const ConstantsYaml = Deno.readTextFileSync(`./Constants.yaml`);

const 상수 = yaml.parse(ConstantsYaml) as Record<string, string>

const createCommand = (command: string) => (target: string) => command.replace('<target>', target);

const click = (클릭: string | Node<ClickableRole>, parent = 'page') => {

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

export function compileSubAction(subAction: SubAction, parent: string): string {
    if('클릭' in subAction){
        return click(subAction.클릭, parent);
    }

    if ("보인다" in subAction){
        return `await expect(${parent}.getByText('${subAction.보인다}')).toBeVisible()`;
    }

    if ("안보인다" in subAction){
        return `await expect(${parent}.getByText('${subAction.안보인다}')).not.toBeVisible()`;
    }

    if ("입력" in subAction){
        return fill(subAction.입력);
    }

    throw Error(`아직 지원하지 않는 서브 액션입니다. ${JSON.stringify(subAction)}`);
}

export function compileAction(action: Action): string {
    const parent = 'parent';

    if ("JS" in action){
        return action.JS;
    }
    if ("기다린다" in action){
        if(typeof action.기다린다 === 'string'){
            return `await ${parent}.getByText('${action.기다린다}').waitFor();`
        }
        const roleName = Object.keys(action.기다린다)[0] as ClickableRole;
        return `await ${parent}.getByRole('${ClickableRoleDict[roleName]}', { name: '${action.기다린다[roleName]}' }).waitFor();`
    }

    if ("페이지로 이동" in action){
        const path = 상수[action["페이지로 이동"]];
        if (!path){
            throw Error(`상수 ${action['페이지로 이동']}가 없습니다`)
        }
        return `await ${parent}.goto('http://localhost:3000${path}');`
    }

    if ("페이지여야한다" in action){
        const path = 상수[action['페이지여야한다']];
        if (!path){
            throw Error(`상수 ${action['페이지여야한다']}가 없습니다`)
        }
        return `await expect(page).toHaveURL(/.*\\${path}/);`
    }

    if ("클릭" in action){
        return click(action.클릭, parent) + ';';
    }

    if ("지움" in action){
        return `await page.getByLabel('${action.지움}').clear();`;
    }
    
    if ("비어있다" in action){
        return `await expect(${parent}.getByLabel('${action.비어있다}')).toBeEmpty();`;
    }

    if ("활성화된다" in action){
        return `await expect(${parent}.getByRole('button', { name: '${action.활성화된다}' })).not.toBeDisabled();`;
    }

    if ("비활성화된다" in action){
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
        return `const ${role} = ${role === 'alertdialog' ? 'page' : parent}.getByRole('${role.toLowerCase()}', { name: '${action[roleName]}' });\n    ${action.안에서.map(subAction => compileSubAction(subAction, role)).join(';\n    ')};`
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
        return fill(action.입력) + ';';
    }

    throw Error(`아직 지원하지 않는 액션입니다. ${JSON.stringify(action)}`);
}

export function compileTestcase([label, actions]: [string, Action[]]){
    return `test('${label}', async ({ page }) => {\n    let parent: Page | Locator = page;\n${actions.map((action => '    ' + compileAction(action))).join('\n\n')}\n});`
}

export function compileTestcases(body: Testcases){
    return `import { type Locator, type Page, expect, test } from '@playwright/test';\n\n` + Object.entries(body)
        .map(compileTestcase).join('\n\n') + '\n'
}
