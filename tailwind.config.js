/* eslint-disable */
module.exports = {
  purge: {
    content: ["./src/**/*.tsx"],
    options: {
      safelist: [
        'dropdown-menu', 'dropdown-item',
        'nav-item', 'nav-link', 'tab-content', 'tab-pane'
      ]
    }
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      backdropInvert: {
        25: '25%',
        50: '50%',
        75: '75%',
      },
      opacity: {
        0: '0',
        1: '.01',
        2: '.02',
        3: '.03',
        4: '.04',
        5: '.05',
        6: '.06',
        7: '.07',
        8: '.08',
        9: '.09',
        10: '.1',
        15: '.15',
        20: '.2',
        25: '.25',
        30: '.3',
        35: '.35',
        40: '.4',
        45: '.45',
        50: '.5',
        55: '.55',
        60: '.6',
        65: '.65',
        70: '.7',
        75: '.75',
        80: '.8',
        85: '.85',
        90: '.9',
        95: '.95',
        100: '1',
      },
      rotate: {
        '10-': '-10deg',
        10: '10deg',
        20: '20deg',
        30: '30deg',
      },
      letterSpacing: {
        0.2: '0.2rem',
        0.3: '0.3rem',
        0.4: '0.4rem',
      },
      transitionProperty: {
        width: 'width',
      },
      transitionDuration: {
        '50': '50ms',
        '250': '250ms',
      },
      height: {
        footer: 'var(--footer-height)',
        fit: 'fit-content',
      },
      width: {
        'sidenav': '210px',
        'sidenav-collapsed': '64px',
        'activity': '296px',
        '0.5/12': '4.166667%',
      },
      margin: {
        '24px': '24px',
      },
      minWidth: {
        104: '26rem',
        'activity': '296px',
      },
      padding: {
        '42px': '42px'
      },
      borderWidth: {
        3: '3px',
      },
      ringOpacity: (theme) => ({
        DEFAULT: '0.5',
        ...theme('opacity')
      }),
      backgroundOpacity: (theme) => ({
        ...theme('opacity')
      }),
      ringWidth: {
        DEFAULT: '3px',
        0: '0px',
        1: '1px',
        2: '2px',
        3: '3px',
        4: '4px',
        8: '8px'
      },
      borderRadius: {
        '1px': '1px',
        '2px': '2px',
        '4px': '4px',
        '6px': '6px',
        '12px': '12px',
        '1/2': '50%',
      },
      fontSize: {
        'supporting-1': ['0.5rem', { lineHeight: '0.625rem' }],
        'supporting-2': ['0.625rem', { lineHeight: '0.75rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '5xl-banner': ['3rem', { lineHeight: '0' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }]
      },
      spacing: {
        50: '12.7rem',
        104: '26rem',
        112: '28rem',
        120: '30rem',
        156: '37.5rem',
      },
      scale: {
      0: '0',
      50: '.5',
      55: '.55',
      60: '.60',
      65: '.65',
      70: '.70',
      75: '.75',
      80: '.80',
      85: '.85',
      90: '.90',
      95: '.95',
      100: '1',
      105: '1.05',
      110: '1.1',
      125: '1.25',
      150: '1.5',
      200: '2',
      300: '3',
      400: '4',
      500: '5'
    },
      boxShadow: {
        b: '2px 1px 3px 0 rgba(0,0,0,0.1),2px 1px 2px 0 rgba(0,0,0,0.06)',
      },
    },
    colors: {
      transparent: 'rgb(0,0,0,0)',
      transparentw: 'rgb(255,255,255,0)',
      current: 'currentColor',
      black: 'rgb(0,0,0)',
      'cool-gray': {
        5: 'rgb(249,250,252)',
        10: 'rgb(242,244,248)',
        20: 'rgb(221,225,230)',
        30: 'rgb(193,199,205)',
        40: 'rgb(162,169,176)',
        50: 'rgb(135,141,150)',
        60: 'rgb(105,112,119)',
        70: 'rgb(77,83,88)',
        80: 'rgb(52,58,63)',
        90: 'rgb(33,39,42)',
        100: 'rgb(18,22,25)'
      },
      gray: {
        10: 'rgb(244,244,244)',
        20: 'rgb(224,224,224)',
        30: 'rgb(198,198,198)',
        40: 'rgb(168,168,168)',
        50: 'rgb(141,141,141)',
        60: 'rgb(111,111,111)',
        70: 'rgb(82,82,82)',
        80: 'rgb(57,57,57)',
        90: 'rgb(22,22,22)',
        100: 'rgb(22,22,22)'
      },
      blue: {
        10: 'rgb(237,245,255)',
        20: 'rgb(208,226,255)',
        30: 'rgb(166,200,255)',
        40: 'rgb(120,169,255)',
        50: 'rgb(69,137,255)',
        60: 'rgb(15,98,254)',
        70: 'rgb(0,67,206)',
        80: 'rgb(0,45,156)',
        90: 'rgb(0,29,108)',
        100: 'rgb(0,17,65)'
      },
      white: 'rgb(255,255,255)',
      red: {
        10: 'rgb(255,241,241)',
        20: 'rgb(255,215,217)',
        30: 'rgb(255,179,184)',
        40: 'rgb(255,131,137)',
        50: 'rgb(250,77,86)',
        60: 'rgb(218,30,40)',
        70: 'rgb(162,25,31)',
        80: 'rgb(117,14,19)',
        90: 'rgb(82,4,8)',
        100: 'rgb(45,7,9)'
      },
      orange: {
        10: 'rgb(255,242,232)',
        20: 'rgb(255,217,190)',
        30: 'rgb(255,183,132)',
        40: 'rgb(255,131,43)',
        50: 'rgb(235,98,0)',
        60: 'rgb(186,78,0)',
        70: 'rgb(138,56,0)',
        80: 'rgb(94,41,0)',
        90: 'rgb(62,26,0)',
        100: 'rgb(35,16,0)'
      },
      green: {
        10: 'rgb(222,251,230)',
        20: 'rgb(167,240,186)',
        30: 'rgb(111,220,140)',
        40: 'rgb(66,190,101)',
        50: 'rgb(36,161,72)',
        60: 'rgb(25,128,56)',
        70: 'rgb(14,96,39)',
        80: 'rgb(4,67,23)',
        90: 'rgb(2,45,13)',
        100: 'rgb(7,25,8)'
      },
      yellow: {
        10: 'rgba(252,244,214)',
        20: 'rgba(253,220,105)',
        30: 'rgba(241,194,27)',
        40: 'rgba(210,161,6)',
        50: 'rgba(178,134,0)',
        60: 'rgba(142,106,0)',
        70: 'rgba(104,78,0)',
        80: 'rgba(72,55,0)',
        90: 'rgba(48,36,0)',
        100: 'rgba(28,21,0)'
      },
      purple: {
        10: 'rgb(246,242,255)',
        20: 'rgb(232,218,255)',
        30: 'rgb(212,187,255)',
        40: 'rgb(190,149,255)',
        50: 'rgb(165,110,255)',
        60: 'rgb(138,63,252)',
        70: 'rgb(105,41,196)',
        80: 'rgb(73,29,139)',
        90: 'rgb(49,19,94)',
        100: 'rgb(28,15,48)'
      },
      cyan: {
        50: 'rgb(236,254,255)',
        100: 'rgb(207,250,254)',
        200: 'rgb(165,243,252)',
        300: 'rgb(103,232,249)',
        400: 'rgb(34,211,238)',
        500: 'rgb(6,182,212)',
        600: 'rgb(8,145,178)',
        700: 'rgb(14,116,144)',
        800: 'rgb(21,94,117)',
        900: 'rgb(22,78,99)'
      },
      indigo: {
        50: 'rgb(239,246,255)',
        100: 'rgb(219,234,254)',
        200: 'rgb(191,219,254)',
        300: 'rgb(147,197,253)',
        400: 'rgb(96,165,250)',
        500: 'rgb(59,130,246)',
        600: 'rgb(79,70,229)',
        700: 'rgb(67,56,202)',
        800: 'rgb(55,48,163)',
        900: 'rgb(49,46,129)'
      },
      fuchsia: {
        50: 'rgb(253,244,255)',
        100: 'rgb(250,232,255)',
        200: 'rgb(245,208,254)',
        300: 'rgb(240,171,252)',
        400: 'rgb(232,121,249)',
        500: 'rgb(217,70,239)',
        600: 'rgb(192,38,211)',
        700: 'rgb(162,28,175)',
        800: 'rgb(134,25,143)',
        900: 'rgb(112,26,117)'
      },
      pink: {
        50: 'rgb(253,242,248)',
        100: 'rgb(252,231,243)',
        200: 'rgb(251,207,232)',
        300: 'rgb(249,168,212)',
        400: 'rgb(244,114,182)',
        500: 'rgb(236,72,153)',
        600: 'rgb(219,39,119)',
        700: 'rgb(190,24,93)',
        800: 'rgb(157,23,77)',
        900: 'rgb(131,24,67)'
      },
      neutral: {
        10: 'rgb(250,251,252)',
        20: 'rgb(244,245,247)',
        30: 'rgb(235,236,240)',
        40: 'rgb(223,225,230)',
        50: 'rgb(193,199,208)',
        60: 'rgb(179,186,197)',
        70: 'rgb(165,173,186)',
        80: 'rgb(151,160,175)',
        100: 'rgb(122,134,154)',
        200: 'rgb(107,119,140)',
        300: 'rgb(94,108,132)',
        400: 'rgb(80,95,121)',
        500: 'rgb(66,82,110)',
        600: 'rgb(52,69,99)',
        700: 'rgb(37,56,88)',
        800: 'rgb(23,43,77)',
        900: 'rgb(9,30,66)'
      }
    },
  },
  variants: {
    extend: {
      ringWidth: ['hover', 'active', 'focus', 'disabled'],
      ringColor: ['hover', 'active', 'focus', 'disabled'],
      borderWidth: ['hover', 'active', 'focus', 'disabled'],
      borderRadius: ['responsive', 'hover', 'active', 'focus', 'disabled'],
      backgroundColor: ['active', 'hover', 'focus', 'disabled', 'group-hover', 'group-focus', 'focus-within'],
      backgroundOpacity: ['active', 'hover', 'focus', 'disabled', 'group-hover', 'group-focus', 'focus-within'],
      visibility: ['group-hover', 'disabled'],
      opacity: ['disabled', 'group-hover', 'group-focus', 'focus-within'],
      pointerEvents: ['disabled'],
      width: ['hover', 'active', 'focus', 'disabled', 'group-hover', 'group-focus', 'focus-within']
    },
  },
  plugins: [
    function ({ addBase, theme }) {
      function extractColorVars(colorObj, colorGroup = '') {
        return Object.keys(colorObj).reduce((vars, colorKey) => {
          const value = colorObj[colorKey];

          const newVars =
            typeof value === 'string'
              ? { [`--color${colorGroup}-${colorKey}`]: value }
              : extractColorVars(value, `-${colorKey}`);

          return { ...vars, ...newVars };
        }, {});
      }

      addBase({
        ':root': extractColorVars(theme('colors')),
      });
    },
  ],
};
