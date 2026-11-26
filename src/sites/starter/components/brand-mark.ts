import { svg } from '../../../shared/html.ts'

/** 模板自己的内联标记；真实克隆优先使用站点原始 SVG 资产。 */
export const brandMark = () =>
  svg.svg(
    {
      viewBox: '0 0 32 32',
      width: '32',
      height: '32',
      'aria-hidden': 'true',
      class: 'starter-mark',
    },
    svg.rect(
      {
        x: '2',
        y: '2',
        width: '28',
        height: '28',
        rx: '9',
        fill: 'currentColor',
        opacity: '0.12',
      },
      '',
    ),
    svg.path(
      {
        d: 'M10 20.5 16 9l6 11.5M12.8 16h6.4',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2.4',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      '',
    ),
  )
