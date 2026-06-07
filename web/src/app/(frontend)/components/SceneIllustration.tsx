import React from 'react'

/**
 * Тематические фолк-иллюстрации страниц (R3 директивы page-imagery): «картинки
 * строго по смыслу», нарисованные кодом — без копирайта (тир-2 политики:
 * AI/собственная графика). Плоский стиль в палитре проекта; фигуры — толстыми
 * штрихами, объекты — заливками. viewBox 0 0 220 150. Показываются крупно в
 * шапке прозовой страницы (PageView) вместо мелкого мотив-медальона.
 */
export type SceneName =
  | 'celebration'
  | 'wrestling'
  | 'feast'
  | 'peoples'
  | 'house'
  | 'plough'
  | 'kids'
  | 'road'
  | 'faq'
  | 'contact'
  | 'document'

// Палитра (совпадает с tokens.css)
const G = '#0a7d3e'
const GD = '#0c5230'
const R = '#c8203f'
const B = '#7a1228'
const Y = '#e8b53a'
const YD = '#c8902a'
const C = '#fff7e6'
const INK = '#3a241a'

// Тюльпан (главный мотив) — заливная версия для сцен
function Tulip({ x, y, s = 1, fill = R }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 V-26" stroke={GD} strokeWidth={3} strokeLinecap="round" />
      <path d="M0 -18 q-9 -3 -13 -12" stroke={GD} strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M0 -18 q9 -3 13 -12" stroke={GD} strokeWidth={3} fill="none" strokeLinecap="round" />
      <path
        d="M0 -44 c-7 2 -10 8 -9 14 2 -3 4 -3 6 -1 1 -4 1 -8 3 -13 2 5 2 9 3 13 2 -2 4 -2 6 1 1 -6 -2 -12 -9 -14Z"
        fill={fill}
      />
    </g>
  )
}

// Стилизованная фигура (народы / дети) — голова + платье-треугольник
function Folk({ x, color }: { x: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={70} r={8} fill={color} />
      <path d={`M${x} 80 L${x - 12} 118 L${x + 12} 118 Z`} fill={color} />
    </g>
  )
}

const SCENES: Record<SceneName, React.ReactNode> = {
  // О фестивале — солнце, гирлянда флажков, тюльпаны
  celebration: (
    <>
      <g stroke={Y} strokeWidth={3} strokeLinecap="round">
        <line x1="110" y1="8" x2="110" y2="20" />
        <line x1="85" y1="14" x2="91" y2="24" />
        <line x1="135" y1="14" x2="129" y2="24" />
        <line x1="70" y1="34" x2="80" y2="40" />
        <line x1="150" y1="34" x2="140" y2="40" />
      </g>
      <circle cx="110" cy="40" r="17" fill={Y} />
      <circle cx="110" cy="40" r="17" fill="none" stroke={YD} strokeWidth="1.5" />
      <path d="M14 62 Q110 84 206 62" fill="none" stroke={B} strokeWidth="2" />
      <path d="M40 70 l8 0 -4 11Z" fill={R} />
      <path d="M86 79 l8 0 -4 11Z" fill={G} />
      <path d="M126 79 l8 0 -4 11Z" fill={R} />
      <path d="M172 70 l8 0 -4 11Z" fill={G} />
      <Tulip x={60} y={130} s={1.1} fill={R} />
      <Tulip x={110} y={132} s={1.3} fill={Y} />
      <Tulip x={160} y={130} s={1.1} fill={R} />
      <line x1="0" y1="132" x2="220" y2="132" stroke={GD} strokeWidth="3" strokeLinecap="round" />
    </>
  ),

  // Майдан — два борца көрәш с кушаком
  wrestling: (
    <>
      <line x1="10" y1="128" x2="210" y2="128" stroke={GD} strokeWidth="3" strokeLinecap="round" />
      {/* борец слева (малиновый) */}
      <g stroke={R} strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M80 56 C 74 74 70 92 72 104" />
        <path d="M72 104 L64 126" />
        <path d="M72 104 L86 126" />
        <path d="M84 64 C 100 66 116 68 132 70" />
      </g>
      <circle cx="84" cy="48" r="9" fill={R} />
      {/* борец справа (зелёный) */}
      <g stroke={G} strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M140 56 C 146 74 150 92 148 104" />
        <path d="M148 104 L156 126" />
        <path d="M148 104 L134 126" />
        <path d="M136 64 C 120 66 104 68 88 70" />
      </g>
      <circle cx="136" cy="48" r="9" fill={G} />
      {/* кушак */}
      <rect x="88" y="74" width="44" height="9" rx="4" fill={Y} stroke={YD} strokeWidth="1" />
    </>
  ),

  // Кухня — казан на огне + чак-чак
  feast: (
    <>
      <line x1="10" y1="130" x2="210" y2="130" stroke={GD} strokeWidth="3" strokeLinecap="round" />
      {/* пар */}
      <g stroke={C} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M70 44 q-6 -8 0 -16 q6 -8 0 -16" />
        <path d="M88 40 q-6 -8 0 -16 q6 -8 0 -16" />
      </g>
      {/* огонь */}
      <path d="M52 116 q8 -18 18 -8 q4 -14 14 -6 q10 -2 8 14Z" fill={Y} />
      <path d="M60 116 q6 -12 12 -4 q4 -8 10 0Z" fill={R} />
      {/* казан */}
      <path d="M44 78 h56 a6 6 0 0 1 6 6 a28 28 0 0 1 -68 0 a6 6 0 0 1 6 -6Z" fill={INK} />
      <ellipse cx="72" cy="80" rx="34" ry="7" fill="#5a3a28" />
      {/* тарелка чак-чака */}
      <ellipse cx="160" cy="120" rx="34" ry="7" fill={C} stroke={YD} strokeWidth="1" />
      <path d="M134 118 q26 -30 52 0Z" fill={Y} />
      <g stroke={YD} strokeWidth="1.4">
        <line x1="146" y1="110" x2="154" y2="118" />
        <line x1="160" y1="104" x2="166" y2="116" />
        <line x1="172" y1="110" x2="176" y2="118" />
      </g>
    </>
  ),

  // Народы края — хоровод фигур в национальных цветах
  peoples: (
    <>
      <line x1="10" y1="118" x2="210" y2="118" stroke={GD} strokeWidth="3" strokeLinecap="round" />
      <g stroke={YD} strokeWidth="3" strokeLinecap="round">
        <line x1="50" y1="92" x2="86" y2="92" />
        <line x1="98" y1="92" x2="122" y2="92" />
        <line x1="134" y1="92" x2="170" y2="92" />
      </g>
      <Folk x={44} color={R} />
      <Folk x={92} color={G} />
      <Folk x={128} color={Y} />
      <Folk x={176} color={B} />
    </>
  ),

  // Подворья — национальный дом с резным фронтоном и забором
  house: (
    <>
      <line x1="6" y1="130" x2="214" y2="130" stroke={GD} strokeWidth="3" strokeLinecap="round" />
      {/* забор */}
      <g fill={YD}>
        <rect x="14" y="104" width="7" height="26" rx="2" />
        <rect x="28" y="104" width="7" height="26" rx="2" />
        <rect x="185" y="104" width="7" height="26" rx="2" />
        <rect x="199" y="104" width="7" height="26" rx="2" />
      </g>
      {/* корпус */}
      <rect x="64" y="74" width="92" height="56" fill={C} stroke={B} strokeWidth="2" />
      {/* крыша */}
      <path d="M56 76 L110 40 L164 76Z" fill={R} stroke={B} strokeWidth="2" />
      <Tulip x={110} y={70} s={0.8} fill={Y} />
      {/* дверь и окно */}
      <rect x="98" y="98" width="24" height="32" fill={B} />
      <rect x="74" y="86" width="18" height="18" fill={G} stroke={B} strokeWidth="1.5" />
      <rect x="128" y="86" width="18" height="18" fill={G} stroke={B} strokeWidth="1.5" />
    </>
  ),

  // История Сабантуя — плуг (сабан) и колос
  plough: (
    <>
      <line x1="10" y1="124" x2="210" y2="124" stroke={GD} strokeWidth="3" strokeLinecap="round" />
      {/* плуг */}
      <g stroke={B} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 56 L150 96" />
        <path d="M60 56 q-10 4 -8 16" />
        <path d="M150 96 L120 116" />
        <path d="M150 96 L168 116" />
      </g>
      <path d="M150 96 l18 8 -6 16 -20 -8Z" fill={YD} stroke={B} strokeWidth="1.5" />
      {/* колос */}
      <g stroke={YD} strokeWidth="3" fill={Y} strokeLinecap="round">
        <line x1="186" y1="118" x2="186" y2="64" />
        <ellipse cx="186" cy="58" rx="5" ry="9" />
        <ellipse cx="177" cy="70" rx="4" ry="7" transform="rotate(-32 177 70)" />
        <ellipse cx="195" cy="70" rx="4" ry="7" transform="rotate(32 195 70)" />
        <ellipse cx="178" cy="84" rx="4" ry="7" transform="rotate(-32 178 84)" />
        <ellipse cx="194" cy="84" rx="4" ry="7" transform="rotate(32 194 84)" />
      </g>
    </>
  ),

  // Детский майдан — воздушный змей и мяч
  kids: (
    <>
      <line x1="10" y1="128" x2="210" y2="128" stroke={GD} strokeWidth="3" strokeLinecap="round" />
      {/* змей */}
      <path d="M120 22 L150 56 L120 90 L90 56Z" fill={R} stroke={B} strokeWidth="1.5" />
      <path d="M120 22 L120 90 M90 56 L150 56" stroke={C} strokeWidth="2" />
      <path d="M120 90 q6 12 -2 20 q-8 8 0 18" fill="none" stroke={YD} strokeWidth="2" />
      <path d="M118 100 l-9 3 7 6Z" fill={Y} />
      <path d="M116 116 l-9 3 7 6Z" fill={G} />
      {/* мяч */}
      <circle cx="60" cy="112" r="16" fill={Y} stroke={YD} strokeWidth="1.5" />
      <path d="M60 96 v32 M44 112 h32" stroke={R} strokeWidth="2" />
    </>
  ),

  // Как добраться — дорога к горизонту, указатель, дерево
  road: (
    <>
      {/* дорога */}
      <path d="M92 40 L128 40 L172 128 L48 128Z" fill="#caa86a" />
      <g stroke={C} strokeWidth="4" strokeLinecap="round" strokeDasharray="6 12">
        <line x1="110" y1="44" x2="110" y2="124" />
      </g>
      {/* указатель */}
      <line x1="150" y1="120" x2="150" y2="58" stroke={B} strokeWidth="5" strokeLinecap="round" />
      <path d="M150 64 H196 l-10 9 10 9 H150Z" fill={G} />
      <path d="M150 86 H110 l10 9 -10 9 H150Z" fill={R} />
      {/* дерево */}
      <line x1="40" y1="124" x2="40" y2="92" stroke={B} strokeWidth="5" strokeLinecap="round" />
      <circle cx="40" cy="78" r="18" fill={G} />
      <line x1="10" y1="128" x2="210" y2="128" stroke={GD} strokeWidth="3" strokeLinecap="round" />
    </>
  ),

  // Частые вопросы — два пузыря речи со знаком вопроса
  faq: (
    <>
      <g>
        <path d="M40 40 h96 a14 14 0 0 1 14 14 v34 a14 14 0 0 1 -14 14 h-58 l-20 18 v-18 h-18 a14 14 0 0 1 -14 -14 v-34 a14 14 0 0 1 14 -14Z" fill={G} />
        <path
          d="M74 60 a14 14 0 0 1 26 7 c0 9 -13 10 -13 18"
          fill="none"
          stroke={C}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="87" cy="96" r="3.5" fill={C} />
      </g>
      <g>
        <path d="M150 92 h40 a10 10 0 0 1 10 10 v22 a10 10 0 0 1 -10 10 h-26 l-14 12 v-12 a10 10 0 0 1 -10 -10 v-22 a10 10 0 0 1 10 -10Z" fill={Y} />
        <g stroke={B} strokeWidth="4" strokeLinecap="round">
          <line x1="160" y1="106" x2="190" y2="106" />
          <line x1="160" y1="116" x2="184" y2="116" />
        </g>
      </g>
    </>
  ),

  // Контакты — конверт и метка на карте
  contact: (
    <>
      <rect x="30" y="54" width="104" height="70" rx="8" fill={C} stroke={B} strokeWidth="2" />
      <path d="M30 62 L82 96 L134 62" fill="none" stroke={R} strokeWidth="3" strokeLinecap="round" />
      {/* метка */}
      <path d="M170 44 a26 26 0 0 1 26 26 c0 20 -26 44 -26 44 c0 0 -26 -24 -26 -44 a26 26 0 0 1 26 -26Z" fill={R} stroke={B} strokeWidth="2" />
      <circle cx="170" cy="70" r="10" fill={C} />
      <line x1="14" y1="130" x2="206" y2="130" stroke={GD} strokeWidth="3" strokeLinecap="round" />
    </>
  ),

  // Правовая информация — щит и документ
  document: (
    <>
      {/* документ */}
      <rect x="40" y="34" width="78" height="100" rx="6" fill={C} stroke={B} strokeWidth="2" />
      <g stroke={YD} strokeWidth="3" strokeLinecap="round">
        <line x1="54" y1="54" x2="104" y2="54" />
        <line x1="54" y1="68" x2="104" y2="68" />
        <line x1="54" y1="82" x2="92" y2="82" />
        <line x1="54" y1="96" x2="104" y2="96" />
        <line x1="54" y1="110" x2="86" y2="110" />
      </g>
      {/* щит */}
      <path d="M150 50 l34 10 v22 c0 24 -16 38 -34 46 c-18 -8 -34 -22 -34 -46 V60Z" fill={G} stroke={GD} strokeWidth="2" />
      <path d="M136 84 l10 11 22 -22" fill="none" stroke={C} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
}

export function SceneIllustration({
  name,
  className,
}: {
  name: SceneName
  className?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 150"
      role="img"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      {SCENES[name]}
    </svg>
  )
}
