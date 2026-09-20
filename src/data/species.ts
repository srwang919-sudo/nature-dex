/* ============================================================
   物种数据 —— 从 Web 版 SPECIES 原样移植（关键字段一致）
   Web 版注释里写过：硬规矩是改字必重裁字体子集，否则缺字回退系统楷体；
   微信小程序版同样要遵守，新加物种也要用同子集覆盖到的字符。
   ============================================================ */

export type FinishKey = 'standard' | 'holo' | 'alt' | 'numbered'
export type Tone = 'ok' | 'warn' | 'muted'

export interface Fact {
  i: string          // icon key (svg 名)
  t: string          // title
  d: string          // description
}

export interface Species {
  zh: string
  latin: string
  en: string
  family: string
  iucn: string
  tone: Tone
  tagline: string
  img: string        // 本地相对路径（assets/images/*.jpg）
  finish: FinishKey
  finishLabel: string
  stars: number
  no: string         // 卡面编号
  habitat: string
  season: string
  at: string
  place?: string
  facts: Fact[]
  know: string
  stats: Array<[string, string]>
  note: string
}

export const FINISHES: Array<{ k: FinishKey; zh: string }> = [
  { k: 'standard', zh: '标准版' },
  { k: 'holo',     zh: '闪卡版' },
  { k: 'alt',      zh: '异画版' },
  { k: 'numbered', zh: '编号珍藏版' }
]

export const BADGE: Record<FinishKey, string> = {
  standard: 'b-std',
  holo:     'b-holo',
  alt:      'b-alt',
  numbered: 'b-num'
}

export const DEPTH_ORDER = ['遇见', '记录', '观察', '追踪'] as const
export type Depth = typeof DEPTH_ORDER[number]

export const DEPTH: Record<keyof typeof SPECIES, Depth> = {
  sparrow: '遇见',
  camellia: '记录',
  egret: '记录',
  moth: '记录',
  kingfisher: '观察',
  ibis: '观察',
  pheasant: '追踪'
}

/** 保护物种一律封顶到「观察」层（朱红国家级保护 -> 同规则） */
export function depthCap(id: keyof typeof SPECIES): boolean {
  return isProtected(SPECIES[id])
}
export function isProtected(s: Species): boolean {
  const blob = s.family + ' ' + (s.place ?? '')
  return /二级|一级|保护|EN|CR|VU/i.test(blob)
}
export function depthOf(id: keyof typeof SPECIES): Depth {
  const cur = DEPTH[id]
  const idx = DEPTH_ORDER.indexOf(cur)
  return depthCap(id) && idx > DEPTH_ORDER.indexOf('观察') ? '观察' : cur
}

export const SPECIES: Record<string, Species> = {
  kingfisher: {
    zh: '普通翠鸟', latin: 'Alcedo atthis', en: 'Common Kingfisher',
    family: '翠鸟科 Alcedinidae', iucn: '无危 LC', tone: 'ok',
    tagline: '蓝得像一小块碎掉的天空', img: 'assets/images/kingfisher.jpg',
    finish: 'alt', finishLabel: '异画版', stars: 4, no: 'No.0007',
    habitat: '塘畔 · 溪流', season: '全年可见', at: '塘畔 · 09:14 · 晴',
    facts: [
      { i: 'dive',  t: '俯冲入水，几乎不溅水花', d: '从枯枝垂直扎进水里，靠瞬膜护住眼睛；命中率能到七成以上。' },
      { i: 'ruler', t: '中国最小的翠鸟',           d: '全长只有 16–18cm，体重 30–40g，比一只麻雀还小一圈。' },
      { i: 'pin',   t: '塘畔与溪流的常客',         d: '爱停在水清、有枯枝伸出的水面；在垂直土岸上挖洞做巢。' }
    ],
    know: '翠鸟的眼睛等于自带两套焦距。入水那一刻，水的折射会把猎物的位置「骗」偏，它会主动修正俯冲角度；而且它能看见紫外光 —— 在我们眼里一片蓝的羽毛，在同类眼里亮得多。',
    stats: [['16–18 cm', '体长'], ['约 40 km/h', '俯冲时速'], ['无危 LC', 'IUCN 等级']],
    note: '它停在塘边那根枯枝上，蓝得像一小块碎掉的天空 —— 我等了整整一个上午。'
  },
  egret: {
    zh: '白鹭', latin: 'Egretta garzetta', en: 'Little Egret',
    family: '鹭科 Ardeidae', iucn: '无危 LC', tone: 'ok',
    tagline: '水面上那一小团不肯落下的云', img: 'assets/images/egret.jpg',
    finish: 'holo', finishLabel: '闪卡版', stars: 3, no: 'No.0031',
    habitat: '滩涂 · 稻田', season: '春秋过境', at: '滩涂 · 06:40 · 雾',
    facts: [
      { i: 'water', t: '会「抖脚」把鱼赶出来', d: '繁殖期脚趾变黄，抖动脚掌惊出藏在泥沙里的小鱼虾。' },
      { i: 'down',  t: '一身白羽曾是奢侈品',   d: '19 世纪欧洲用它繁殖期的饰羽做帽子，一度被大量捕杀，也正是现代鸟类保护的起点。' },
      { i: 'dive',  t: '站在浅水里一动不动',     d: '靠极慢的步伐接近猎物，最后一击只要 0.1 秒。' }
    ],
    know: '白鹭会「换脸」。头顶的辫羽和背上的蓑羽只在繁殖期长出来，非繁殖期的它是一只光溜溜的普通白鸟 —— 很多人因此在冬天认不出它。',
    stats: [['55–65 cm', '体长'], ['≈100 cm', '翼展'], ['无危 LC', 'IUCN 等级']],
    note: '雾还没散，它站在浅水里，像一团不肯落下的云。'
  },
  ibis: {
    zh: '朱鹮', latin: 'Nipponia nippon', en: 'Crested Ibis',
    family: '鹮科 Threskiornithidae', iucn: '濒危 EN', tone: 'warn',
    tagline: '从 7 只重新长回一片天空', img: 'assets/images/ibis.jpg',
    finish: 'numbered', finishLabel: '编号珍藏版', stars: 4, no: 'No.0021',
    habitat: '水田 · 浅溪', season: '留鸟', at: '水田 · 17:20 · 阴', place: '陕西 洋县',
    facts: [
      { i: 'down',  t: '1981 年全世界只剩 7 只', d: '在陕西洋县被重新发现，当时整个物种只剩下这一小群。' },
      { i: 'smell', t: '繁殖期会把自己「染」灰',  d: '颈部分泌黑色素，用嘴涂到羽毛上 —— 不是换羽变色。' },
      { i: 'spark', t: '现在约 1 万只',             d: '靠人工繁育与野化放归，从「极危」降到了「濒危」。' }
    ],
    know: '朱鹮的脸在繁殖期会变成鲜红色 —— 那不是羽毛，是裸露的皮肤充血。它也是全球鸟类中，从「极危」成功降级到「濒危」的极少数案例之一。',
    stats: [['55–80 cm', '体长'], ['7 只到约 1 万', '种群变化'], ['濒危 EN', 'IUCN 等级']],
    note: '它从水田里抬起头的那一秒，整片天空好像都安静了一下。'
  },
  camellia: {
    zh: '山茶', latin: 'Camellia japonica', en: 'Japanese Camellia',
    family: '山茶科 Theaceae', iucn: '无危 LC', tone: 'ok',
    tagline: '在冬天开花的树', img: 'assets/images/camellia.jpg',
    finish: 'standard', finishLabel: '标准版', stars: 2, no: 'No.0088',
    habitat: '山林 · 公园', season: '11–3 月花期', at: '山林 · 15:02 · 晴',
    facts: [
      { i: 'moon',   t: '在最冷的季节开花',     d: '花期 11 月到翌年 3 月，靠冬季仍在活动的鸟（如暗绿绣眼鸟）传粉。' },
      { i: 'flower', t: '花瓣会整朵一起落下',   d: '不像别的花一瓣一瓣掉，它整朵掉下来，落花铺满一地。' },
      { i: 'leaf',   t: '叶子里有秘密武器',     d: '叶片含茶皂素，能当天然洗涤剂，也能防虫 —— 古人早就用它洗头。' }
    ],
    know: '山茶和茶树是同一个属的近亲。你喝的茶学名就叫 Camellia sinensis —— 茶、山茶油、院子里那棵红山茶，其实是一家人。',
    stats: [['1.5–6 m', '树高'], ['11–3 月', '花期'], ['无危 LC', 'IUCN 等级']],
    note: '冬天里唯一还在开的花。整朵落下的时候，像谁把花轻轻放在了地上。'
  },
  moth: {
    zh: '绿尾大蚕蛾', latin: 'Actias ningpoana', en: 'Chinese Moon Moth',
    family: '大蚕蛾科 Saturniidae', iucn: '未评估 NE', tone: 'muted',
    tagline: '长了尾巴的月亮', img: 'assets/images/moth.jpg',
    finish: 'holo', finishLabel: '闪卡版', stars: 3, no: 'No.0142',
    habitat: '阔叶林 · 灯火下', season: '5–9 月', at: '山径 · 22:48 · 夜',
    facts: [
      { i: 'moon',  t: '成虫完全不吃东西',   d: '口器已经退化，羽化后只活 7–10 天，全部能量用来寻找配偶。' },
      { i: 'spark', t: '长尾是「骗蝙蝠」的', d: '尾巴扭动能干扰蝙蝠的回声定位，让捕食手偏掉几厘米。' },
      { i: 'bird',  t: '眼斑会吓人一跳',     d: '受惊时张开前翅，露出四枚眼斑，模仿猫头鹰或蛇的眼睛。' }
    ],
    know: '它的一生几乎都在「减肥」：幼虫期疯狂吃叶子攒脂肪，变成成虫后一口都不能吃，只能靠存货撑完最后十天。蛾不是不好看的蝴蝶 —— 它是属于夜里的那一半。',
    stats: [['10–14 cm', '翼展'], ['7–10 天', '成虫寿命'], ['未评估 NE', 'IUCN 等级']],
    note: '灯下第一次见，还以为是风吹来的一片叶子，直到它张开了那对尾巴。'
  },
  pheasant: {
    zh: '红腹锦鸡', latin: 'Chrysolophus pictus', en: 'Golden Pheasant',
    family: '雉科 Phasianidae', iucn: '无危 LC', tone: 'ok',
    tagline: '中国特有的「金鸡」', img: 'assets/images/pheasant.jpg',
    finish: 'numbered', finishLabel: '编号珍藏版', stars: 4, no: 'No.0210',
    habitat: '山地森林', season: '全年可见', at: '山林 · 16:35 · 斜阳',
    facts: [
      { i: 'pin',   t: '只在中国有野生种群', d: '分布于秦岭以南的山地森林，海拔 500–2500m，是中国的特有鸟种。' },
      { i: 'spark', t: '「凤凰」画稿的灵感之一', d: '也是中国鸟类学会会徽的原型 —— 一身红金配色，古人称它金鸡。' },
      { i: 'bird',  t: '求偶要跳「之」字舞',     d: '雄鸟侧身把彩色披肩朝雌鸟展开，边转边跳，绕圈炫耀好几分钟。' }
    ],
    know: '它的金色不是色素，而是羽毛里微小结构对光线的散射。一旦被汗水或雨水打湿，这份金色会立刻暗下去 —— 所以它只在干爽的清晨和斜阳里最耀眼。',
    stats: [['60–110 cm', '体长'], ['500–2500 m', '栖息海拔'], ['无危 LC', 'IUCN 等级']],
    note: '它从灌丛里走出来，斜阳正好落在披肩上 —— 那天我才明白「金鸡」不是夸张。'
  },
  sparrow: {
    zh: '麻雀', latin: 'Passer montanus', en: 'Eurasian Tree Sparrow',
    family: '雀科 Passeridae', iucn: '无危 LC', tone: 'ok',
    tagline: '最容易被忽略的邻居', img: 'assets/images/sparrow.jpg',
    finish: 'standard', finishLabel: '标准版', stars: 1, no: 'No.0001',
    habitat: '屋檐 · 街巷', season: '全年可见', at: '窗前 · 07:20 · 晴',
    facts: [
      { i: 'bird', t: '耳羽黑斑是它的身份证', d: '成年麻雀耳羽处有黑斑、脸颊有白点，一眼就能和别的小雀区分开。' },
      { i: 'down', t: '会跟着人住',           d: '筑巢在屋檐、墙缝、空调外机里，是典型的伴人鸟 —— 它选了人类当邻居。' },
      { i: 'leaf', t: '秋天会囤粮',           d: '秋季有一部分个体会集中觅食谷粒，装进嗉囊带回藏起来。' }
    ],
    know: '麻雀其实是「定居者」。和多数候鸟不同，它一年四季都在同一个方圆一两公里内活动 —— 你窗前那只，很可能就是去年同一只。',
    stats: [['12–14 cm', '体长'], ['全年', '可见期'], ['无危 LC', 'IUCN 等级']],
    note: '它每天七点二十准时出现在窗台，比我上班还准。'
  }
}

export const DEX_DEFAULT = {
  chapterName: '第 1 章 · 塘畔与山林',
  total: 9,
  order: ['kingfisher', 'egret', 'pheasant', 'camellia', 'sparrow', 'moth', 'ibis'] as const,
  collected: ['egret', 'pheasant', 'camellia', 'sparrow'] as const
}

export const SPECIES_KEYS = DEX_DEFAULT.order
export type SpeciesKey = typeof SPECIES_KEYS[number]