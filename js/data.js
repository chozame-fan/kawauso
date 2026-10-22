// カワウソ育成：調べた事実をまとめたデータ
// 種はコツメカワウソ（Aonyx cinereus）。数字は動物園・水族館の飼育記録と図鑑の値の真ん中あたり。

// 体の大きさ（日齢 → 全長cm・体重g）。全長は鼻先〜しっぽの先。
export const GROWTH = [
  // [日齢, 全長cm, 体重g]
  [0, 15, 50],     // 生まれた時 40〜55g・目は閉じている
  [14, 19, 140],
  [35, 26, 380],   // このころ目が開きはじめる
  [63, 36, 800],   // 9週ごろ 泳ぎの練習
  [98, 48, 1400],  // 14週ごろ 離乳
  [180, 66, 2300],
  [365, 80, 3000], // 1歳でほぼおとなの大きさ
  [730, 86, 3300], // 2歳でおとな（繁殖できる年ごろ）
  [3650, 88, 3400],
];

function lerpTable(d, col) {
  const T = GROWTH;
  if (d <= T[0][0]) return T[0][col];
  for (let i = 1; i < T.length; i++) {
    if (d <= T[i][0]) {
      const a = T[i - 1], b = T[i], t = (d - a[0]) / (b[0] - a[0]);
      const s = t * t * (3 - 2 * t) * 0.35 + t * 0.65; // 少しなめらかに
      return a[col] + (b[col] - a[col]) * s;
    }
  }
  return T[T.length - 1][col];
}
export const lengthAt = d => lerpTable(d, 1);
export const weightAt = d => lerpTable(d, 2);

// 成長の段階
export const STAGES = [
  { id: 'newborn', from: 0, name: '生まれたて', note: '目はまだ閉じていて、ほとんど寝てすごす。ミルクは3〜4時間おき。' },
  { id: 'eyes', from: 38, name: '目がひらいた', note: '生後35〜40日ごろ目が開く。まだ足元はふらふら。' },
  { id: 'toddle', from: 46, name: 'よちよち期', note: '巣から出てよちよち歩きはじめる。なんでも口に入れて確かめる。' },
  { id: 'swim', from: 63, name: '水あそび期', note: '9〜12週ごろ、親に教わって泳ぎを覚える。最初は水がこわい。' },
  { id: 'wean', from: 98, name: '離乳期', note: '14週ごろミルクを卒業。魚やエビを自分で食べる。' },
  { id: 'child', from: 130, name: 'こども', note: '石あそびや追いかけっこで、狩りの練習をする年ごろ。' },
  { id: 'young', from: 240, name: 'わかもの', note: '体つきがすっとして、毛もつやつやの大人の毛になる。' },
  { id: 'adult', from: 365, name: 'おとな', note: '1歳でほぼ大人の大きさ。体重は2.5〜3.5kgほど。' },
];
export function stageAt(d) {
  let s = STAGES[0];
  for (const x of STAGES) if (d >= x.from) s = x;
  return s;
}

// ごはん（from〜to日齢で食べられる）
export const FOODS = [
  { id: 'milk', name: 'ミルク', icon: '🍼', from: 0, to: 110, fill: 34, note: '子ネコ用のミルクを人肌に温めて。生まれたては3〜4時間おき。' },
  { id: 'paste', name: '魚のすり身', icon: '🥣', from: 70, to: 140, fill: 30, note: '離乳食。ミルクにすり身をまぜて少しずつ固形に。' },
  { id: 'fish', name: '小魚（ワカサギ）', icon: '🐟', from: 85, fill: 34, note: '頭から丸ごと。前足でしっかり持って食べる。' },
  { id: 'shrimp', name: 'エビ', icon: '🦐', from: 95, fill: 26, note: '殻ごとバリバリ。野生でもよく食べる。' },
  { id: 'crab', name: 'サワガニ', icon: '🦀', from: 120, fill: 30, note: 'コツメカワウソの大好物。石の下を前足で手さぐりして探す。' },
  { id: 'crayfish', name: 'ザリガニ', icon: '🦞', from: 150, fill: 36, note: 'はさみに気をつけながら、器用に前足でおさえて食べる。' },
  { id: 'clam', name: 'アサリ', icon: '🐚', from: 180, fill: 22, note: '殻を日なたに置いて、開いたところを食べる知恵がある。' },
];

// あそび
export const TOYS = [
  { id: 'fishtoy', name: 'おさかなぬいぐるみ', icon: '🐠', from: 20, note: 'ぎゅっと抱きしめたり、かみかみしたり。' },
  { id: 'stone', name: '小石', icon: '🪨', from: 100, note: '前足で石をころころ転がす「石あそび」。' },
  { id: 'ball', name: 'ボール', icon: '⚽', from: 46, note: '鼻先でつついて追いかける。' },
  { id: 'water', name: '水あそび', icon: '💧', from: 50, note: 'たらい（100日〜はプール）で水あそび。' },
  { id: 'sled', name: 'おなかでスーッ', icon: '🛷', from: 90, note: '走ってはお腹ですべる。空いた所をさがしてくり返す。' },
  { id: 'tunnel', name: 'トンネル', icon: '🌀', from: 60, room: true, note: 'くぐり抜けて、ひょっこり。' },
  { id: 'sandbox', name: '砂場', icon: '⛱️', from: 120, room: true, note: '前足でほりほり。' },
  { id: 'hammock', name: 'ハンモックでおひるね', icon: '🛏️', from: 150, room: true, note: '上に跳び乗ってゆらゆら。' },
  { id: 'stump', name: '流木の切り株', icon: '🪵', from: 200, room: true, note: '登って見わたす。' },
];

// 図鑑（できごと）
export const ZUKAN = [
  { id: 'birth', name: 'はじめまして', icon: '🌱', hint: 'はじめから', desc: 'コツメカワウソは1回に1〜6匹（よく2〜4匹）生まれる。生まれた時は40〜55gほどで、目も耳も閉じている。', cam: 'front' },
  { id: 'milk', name: 'はじめてのミルク', icon: '🍼', hint: 'ミルクをあげる', desc: '生まれてしばらくは3〜4時間おきにミルクを飲み、あとはほとんど眠っている。', cam: 'front' },
  { id: 'voice', name: 'ピィピィ鳴いた', icon: '🎵', hint: 'おなかがすくと…', desc: 'コツメカワウソは12種類ほどの鳴き声を使い分ける、とてもおしゃべりな動物。赤ちゃんは「ピィピィ」と高い声で呼ぶ。', cam: 'face' },
  { id: 'eyes', name: '目がひらいた', icon: '👀', hint: '40日ごろ', desc: '目が開くのは生後35〜40日ごろ。最初はうっすら、数日かけてまんまるに開く。', cam: 'face' },
  { id: 'nade', name: 'なでなで', icon: '🤚', hint: 'カワウソをタップ', desc: '頭や背中をなでられると目を細めてじっとする。家族でくっついてくらす動物なので、ふれあいが大好き。', cam: 'face' },
  { id: 'yochi', name: 'よちよち歩き', icon: '🐾', hint: '46日ごろ', desc: '6〜7週ごろ巣から出て歩きはじめる。頭が重くて、ころんと転ぶことも。', cam: 'side' },
  { id: 'hesoten', name: 'へそ天ねんね', icon: '😴', hint: 'なかよしになって寝ると', desc: 'お腹を見せて眠るのは、まわりが安心な場所だと思っているしるし。', cam: 'top' },
  { id: 'blanket', name: 'ブランケットにくるまる', icon: '🧣', hint: 'ブランケットをかける', desc: 'カワウソは体温を毛で保つ。水から上がった後や眠い時は、暖かい場所にもぐりこむ。', cam: 'face' },
  { id: 'fishtoy', name: 'おさかなをぎゅっ', icon: '🐠', hint: 'ぬいぐるみであそぶ', desc: '前足が器用で、ものを抱えたりにぎったりできる。小さな爪は指先より短い。', cam: 'front' },
  { id: 'tachi', name: '立っち', icon: '🧍', hint: '気になるものがあると', desc: '気になるものがあると、後ろ足で立ち上がってまわりを見わたす。', cam: 'front' },
  { id: 'tarai', name: 'はじめての水あそび', icon: '💧', hint: '水あそび（50日〜）', desc: '水の動物なのに、赤ちゃんは最初から泳げるわけではない。浅い水で少しずつ慣れていく。', cam: 'side' },
  { id: 'swim', name: 'スイスイ泳げた', icon: '🏊', hint: '水あそび（63日〜）', desc: '9〜12週ごろに泳ぎを覚える。水かきのある後ろ足と、太いしっぽで進む。', cam: 'side' },
  { id: 'fish', name: 'はじめてのお魚', icon: '🐟', hint: '小魚をあげる', desc: '14週ごろには離乳して、魚やエビを自分で食べられるようになる。', cam: 'front' },
  { id: 'kezukuroi', name: '毛づくろい', icon: '✨', hint: '泳いだあとに', desc: '泳いだ後は念入りに毛づくろい。毛に空気をふくませて、水が肌まで届かないようにしている。', cam: 'front' },
  { id: 'ishi', name: '石あそび', icon: '🪨', hint: '小石であそぶ（100日〜）', desc: '前足で小石を転がしたり持ちかえたりする。狩りの練習や、ひまつぶしと考えられている。', cam: 'front' },
  { id: 'kani', name: 'カニを手さぐり', icon: '🦀', hint: 'カニをあげる（120日〜）', desc: '水の底や石の下を前足で手さぐりして、カニや貝を見つける。目より手で探す狩りの名人。', cam: 'front' },
  { id: 'uttori', name: 'うっとりへそ天', icon: '😊', hint: 'なかよし度が高い時にたくさんタップ', desc: '安心しきると、なでられながらごろんとお腹を見せる。お腹は大事な場所なので、信頼のしるし。', cam: 'top' },
  { id: 'kasanari', name: 'かさなりねんね', icon: '💤', hint: 'きょうだいと一緒に寝ると', desc: 'コツメカワウソは家族のむれでくらし、寝る時は体をくっつけ合って眠る。', cam: 'top' },
  { id: 'kubikashige', name: '首かしげ', icon: '❓', hint: 'じっと見つめていると', desc: '気になる音やものがあると、首をかしげて耳や目の位置を変え、よく確かめようとする。', cam: 'face' },
  { id: 'wink', name: 'ウインク', icon: '😉', hint: 'なかよしになると…？', desc: '片目だけつぶるのは、目に入ったゴミを取ったり、まぶしかったりする時。たまたまでもうれしい。', cam: 'face' },
  { id: 'buruburu', name: 'ぶるぶる', icon: '💦', hint: '泳いだあとに', desc: '水から上がると体を大きくふるわせて水を飛ばす。毛の中の水を減らして体を冷やさないため。', cam: 'front' },
  { id: 'goron', name: 'ごろん', icon: '🔄', hint: 'ごきげんな時に', desc: 'ごろんと転がって背中をこすりつけるのは、毛を整えたり、においをつけたりするしぐさ。', cam: 'top' },
  { id: 'nobi', name: 'のび〜', icon: '🙆', hint: '起きたあとに', desc: '起きたら前足をぐーっと伸ばして体をほぐす。ネコやイヌと同じ。', cam: 'side' },
  { id: 'kaki', name: 'かきかき', icon: '🦶', hint: 'のんびりしている時', desc: '後ろ足で耳のうしろをかく。体がやわらかいので頭の上まで足がとどく。', cam: 'front' },
  { id: 'kurukuru', name: 'しっぽ追いかけ', icon: '🌀', hint: 'わんぱくな子は…', desc: '自分のしっぽを追いかけてくるくる回る。子どものカワウソはひとり遊びも上手。', cam: 'top' },
  { id: 'pyon', name: 'ぴょんぴょん', icon: '🐇', hint: 'うれしい時', desc: 'うれしいと、はねるように跳びまわる。カワウソの「ぴょこぴょこ歩き」は背中を丸めて弾む走り方。', cam: 'side' },
  { id: 'onedari', name: 'おねだりパチパチ', icon: '👏', hint: 'おなかがすいた時', desc: '水族館のコツメカワウソは、前足を出してごはんをおねだりすることで有名。手のひらで物をさわって確かめる。', cam: 'front' },
  { id: 'baibai', name: 'おててふりふり', icon: '👋', hint: 'なかよし度が高いと', desc: '前足を上げてふる姿はまるで「バイバイ」。前足の感覚がとても鋭い動物。', cam: 'front' },
  { id: 'oteawase', name: 'おててあわせ', icon: '🙏', hint: 'なかよし度が高いと', desc: '両手を胸の前でそろえるしぐさ。前足が器用なコツメカワウソならでは。', cam: 'face' },
  { id: 'batabata', name: 'へそ天バタバタ', icon: '🤸', hint: 'へそ天でなでると', desc: 'あおむけで足をバタバタさせるのは、遊んでほしい時やごきげんな時。', cam: 'top' },
  { id: 'tonneru', name: 'トンネルくぐり', icon: '🌀', hint: 'お部屋にトンネルが来たら', desc: 'せまい穴やすき間にもぐるのが大好き。野生では川岸の穴や木の根のすき間を巣にする。', cam: 'side' },
  { id: 'horihori', name: 'ほりほり', icon: '⛱️', hint: '砂場で', desc: '前足で砂や泥をかき分けて、カニや貝を探す。手さぐりの狩りの練習。', cam: 'front' },
  { id: 'hammock', name: 'ハンモックでおひるね', icon: '🛏️', hint: 'ハンモックが来たら', desc: 'カワウソは1日の半分以上を寝てすごす。ゆらゆら揺れる寝床もお気に入り。', cam: 'top' },
  { id: 'takai', name: 'たかいところ', icon: '🪵', hint: '流木の切り株が来たら', desc: '高い所に登って、まわりを見わたす。立ち上がって遠くを見るのも得意。', cam: 'front' },
  { id: 'onakasu', name: 'おなかでスーッ', icon: '🛷', hint: '元気なわんぱくさんは…', desc: '数歩走っては、お腹をソリのようにしてすべる。それをくり返して進む。雪や氷の上でカワウソが見せる移動のしかたで、遊んでいるようにも見える。', cam: 'side' },
  { id: 'otona', name: 'おとなになった', icon: '🎉', hint: '1歳', desc: '1歳でほぼ大人の大きさ。野生では川や田んぼ、マングローブで家族とくらす。', cam: 'side' },
];

// 見た目の種類（毛色・顔の模様・鼻・瞳・アホ毛）
export const COATS = [
  { id: 'futsu', name: 'ふつう', main: '#7b5b48', adult: '#644636', cream: '#ecdcc8' },   // 動画の子のようなチョコレート色
  { id: 'milktea', name: 'ミルクティー', main: '#a38c79', adult: '#8a7260', cream: '#f6efe6' },
  { id: 'kogecha', name: 'こげ茶', main: '#6c5142', adult: '#553e31', cream: '#ece0d0' },
  { id: 'greige', name: 'グレージュ', main: '#857b74', adult: '#6b625c', cream: '#f0ebe5' },
  { id: 'cinnamon', name: 'シナモン', main: '#8f6649', adult: '#744f36', cream: '#f3e3cf' },
  { id: 'cocoa', name: 'ココア', main: '#5a4740', adult: '#463630', cream: '#e6d8c8' },
];
export const FACES = [
  { id: 'mask', name: 'ふつう' },
  { id: 'big', name: 'しろいおかお' },
  { id: 'small', name: 'くちもとだけ白' },
  { id: 'brow', name: 'まゆげ' },
  { id: 'bridge', name: 'はなすじ' },
  { id: 'bib', name: 'よだれかけ' },
];
export const NOSES = [
  { id: 'choco', name: 'こげ茶', c: '#5a3a35' },
  { id: 'pink', name: 'ピンク', c: '#c4908a' },
  { id: 'rose', name: 'ピンクブラウン', c: '#a66f67' },
  { id: 'black', name: 'くろ', c: '#2e2321' },
];
export const IRIS = [
  { id: 'choco', name: 'チョコ', c: '#4a2e1f' },
  { id: 'amber', name: 'こはく', c: '#7a4b24' },
  { id: 'kuro', name: 'くろ', c: '#24160f' },
];
export const TUFTS = ['tuft', 'one', 'curl', 'none'];

// 月齢で増えるお部屋の遊び場
export const ROOM_ITEMS = [
  { id: 'tunnel', day: 60, name: 'トンネル', icon: '🌀', note: 'くぐり抜けて遊ぶ。せまい所にもぐるのはカワウソの得意わざ。' },
  { id: 'sandbox', day: 120, name: '砂場', icon: '⛱️', note: '前足でほりほり。石の下のカニを探す練習。' },
  { id: 'hammock', day: 150, name: 'ハンモック', icon: '🛏️', note: '上でゆらゆらお昼寝。' },
  { id: 'stump', day: 200, name: '流木の切り株', icon: '🪵', note: '坂を登って、高い所から見わたす。' },
];

// 名前の候補・性格
export const NAMES = ['こつめ', 'もなか', 'きなこ', 'ちくわ', 'おもち', 'ぽてと', 'みたらし', 'あずき', 'こむぎ', 'くるみ', 'まめた', 'ぷりん'];
export const PERSONAS = [
  { id: 'amae', name: 'あまえんぼう', line: 'すぐ近くに来て、なでてほしがる' },
  { id: 'wanpaku', name: 'わんぱく', line: 'じっとしていない。いつも探検中' },
  { id: 'kuishin', name: 'くいしんぼう', line: 'ごはんの音にいちばんに反応する' },
  { id: 'nonbiri', name: 'のんびりや', line: 'よく寝て、よくへそ天になる' },
];

// 出典（図鑑の「参考にした資料」タブ）
export const SOURCES = [
  ['コツメカワウソの繁殖（Otterjoy）', 'https://www.otterjoy.com/otterinfo/aonyx/cinereus/cinereus_breeding.html'],
  ['Asian small-clawed otter（Columbus Zoo）', 'https://www.columbuszoo.org/animals/asian-small-clawed-otter'],
  ['人工哺育の記録 Webb 2011（IUCN Otter Specialist Group Bulletin）', 'https://iucnosgbull.org/Volume28A/Webb_2011.html'],
  ['コツメカワウソの赤ちゃん（ウォーカープラス）', 'https://www.walkerplus.com/article/1148851/'],
  ['環境省：国際希少野生動植物種の追加（2019年11月）', 'https://www.env.go.jp/press/107376.html'],
];

export const LAW_NOTE = 'コツメカワウソは絶滅のおそれがあり（IUCN危急種）、2019年からワシントン条約の附属書Ⅰ・日本の「国際希少野生動植物種」になりました。売り買いや譲りわたしは登録や許可が必要で、ペットとして気軽に飼える動物ではありません。このゲームの中で、思いきりかわいがってあげてください。';
