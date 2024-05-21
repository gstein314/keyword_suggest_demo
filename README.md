# smart_text_box

## デモについて

### 起動手順

1. main.js で smartTextBox 関数を呼び出し、以下の引数を指定してください。

```javascript
input_box_id - 入力ボックス要素のID。必須です。
data_path - TSVファイルのパス。必須です。
[options={}] - 追加設定を指定するオプションオブジェクト。省略可能です。
[options.api_url=''] - もしかして検索をするためのAPIのURL（オプション）。
[options.includeNoMatch=false] - キーワードが見つからない場合にキーワード自体の選択欄を含めるかどうか（オプション）。
```

2. もしかして検索をローカルで試したい場合は、API サーバーを起動してください。デモ用に作成した（server.js）は Node.js と Express を使用しています。

```sh
npm init -y
```

```sh
npm install express
```

```sh
node server.js
```

3. VSCode の拡張機能である Live Server で確認してください。

## 使い方

最小限の構成として、デモファイルのような html ファイル、css ファイル、js ファイル、tsv ファイルを用意してください。（server.js はデモ用なのでなくても問題ありません。）

### HTML

html ファイルに以下のようなコードを記述し、input 要素は div 要素（class="suggest-container"）で囲むようにしてください。また、id は任意のものを指定してください。

```html
<div class="smart-text-box-container">
  <input
    type="text"
    id="inputBoxID"
    class="smart-text-box-input"
    autocomplete="off"
    placeholder="Search..."
  />
</div>
```

### CSS

style.css に含まれるコードをコピーしてご利用の CSS ファイルに追加してください。

smart_text_box.js ファイルをコピーして追加してください。利用したい js ファイルで以下のように呼び出してください。

### JavaScript

```javascript
// smart_text_box.js のインポート
import { smartTextBox } from './smart_text_box.js';

// 関数の呼び出し
smartTextBox('inputBoxID', 'path/to/keywords.tsv');

// カスタムイベントのリスナー（インプットボックスのIDと選択したラベル情報のオブジェクトを取得する例）
document.addEventListener('selectedLabel', function (event) {
  const selectedInputBox = event.detail.inputBoxId;
  const selectedObject = event.detail.labelInfo;
  console.log(selectedInputBox);
  console.log(selectedObject);
});
```

### TSV

TSV ファイルは以下のような構成にしてください。

```tsv
ID label_en synonym_en label_ja synonym_ja
```

## smart_text_box.js の詳細

### 概要

この JavaScript モジュールは、入力ボックスに対してキーワードの候補をサジェストする機能を提供します。ローカルの TSV ファイルから取得したデータや、必要に応じて外部 API から取得したデータに基づいてキーワードをサジェストします。サジェストされたキーワードは、入力ボックスの下にドロップダウンで表示され、ユーザーが選択できるようになります。

#### 関数の説明

##### smartTextBox

目的: ユーザーの入力に基づいてキーワードの候補をサジェストします。

パラメータ:
input_box_id (string): 入力ボックスの要素 ID。
data_path (string): キーワードデータを含む TSV ファイルのパス。
options (object, 任意):
api_url (string): 追加のキーワード候補を取得するための API の URL。
includeNoMatch (boolean): キーワードが見つからない場合にキーワード自体の選択欄を含めるかどうか。

##### 機能

###### 初期化:

- 指定された TSV ファイルからキーワードデータを取得します。
- 必要に応じて API から追加の候補を取得します。
- ユーザーの入力やインタラクションに対するイベントリスナーを設定します。

###### イベントリスナー:

- input: ユーザーの入力に基づいてキーワードの候補を表示します。
- keydown: 提案されたキーワードのドロップダウン内でのキーボードナビゲーションを処理します。
- compositionstart および compositionend: 複雑な入力方法を持つ言語の入力構成を処理します。
- focus: 入力ボックスがフォーカスを取得したときに検索を再トリガーします。
- click (outside): サジェストボックスの外側をクリックしたときにサジェストボックスを非表示にします。

###### キーワードサジェストの処理:

- 入力値を正規化し、ローカルデータから一致するキーワードを検索します。
- 一致するキーワードが見つからない場合、API から追加の候補を取得します。
- 提案されたキーワードをドロップダウン形式で表示し、ユーザーが選択できるようにします。

###### キーワードのハイライト:

- 提案されたキーワードの中で入力に一致する部分をハイライト（太字）表示します。

###### 選択の更新:

- キーボードやマウス操作によって選択されたキーワードの項目を更新します。

#### 使用例

以下のように、keywordSuggest 関数を呼び出して使用します。

1. ローカルデータだけ使用する場合

```javascript
keywordSuggest('inputBoxID', 'path/to/keywords.tsv');
```

2. もしかして検索を使用（ローカルデータがヒットしないとき）する場合

```javascript
keywordSuggest('inputBoxID', 'path/to/keywords.tsv', {
  api_url: 'https://api.example.com/keywords',
});
```

3. キーワード自体の選択欄を表示する場合

```javascript
keywordSuggest('inputBoxID', 'path/to/keywords.tsv', {
  includeNoMatch: true,
});
```

4. もしかして検索とキーワード自体の選択欄を表示する場合

```javascript
keywordSuggest('inputBoxID', 'path/to/keywords.tsv', {
  api_url: 'https://api.example.com/keywords',
  includeNoMatch: true,
});
```
