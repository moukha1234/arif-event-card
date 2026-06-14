/* ==========================================================================
   ARIF EVENT CARD - CANVAS LAYOUT CONFIGURATIONS (PIXEL PERFECT)
   ========================================================================== */

const LayoutConfig = {
  // Canvas dimensions
  canvas: {
    width: 800,
    height: 1000
  },
  
  // Background configurations
  background: {
    topHeight: 480,
    topGradient: ['#0A1128', '#152238', '#290822'],
    bottomColor: '#FAF9F6',
    gridDotColor: 'rgba(0, 0, 0, 0.015)'
  },
  
  // Torn paper divider Y
  divider: {
    y: 450,
    height: 40
  },
  
  // ARIF Logo position
  logo: {
    x: 45,
    y: 40,
    width: 276,
    height: 76
  },
  
  // Date seal badge position
  dateBadge: {
    x: 625, // 800 - 45 - 130
    y: 40,
    width: 130,
    height: 130
  },
  
  // User profile picture position and framing
  profile: {
    cx: 400,
    cy: 445,
    outerRadius: 135, // Border radius (increased from 120)
    innerRadius: 128, // Dashed border radius (increased from 114)
    clipRadius: 123,   // Image mask radius (increased from 110)
    borderColor: '#E2007A',
    innerDashedColor: '#00A1C9',
    seal: {
      cx: 506, // 400 + 106 (adjusted for outerRadius 135)
      cy: 551, // 445 + 106 (adjusted for outerRadius 135)
      r: 25,
      color: ['#00A1C9', '#008CA8']
    }
  },
  
  // Heading badge (CONFIRMATION DE PARTICIPATION)
  headingBadge: {
    y: 630, // Shifted +15px from 615
    height: 34,
    color: '#E2007A',
    bgColor: 'rgba(226, 0, 122, 0.05)',
    borderColor: 'rgba(226, 0, 122, 0.22)'
  },
  
  // Text configurations
  text: {
    salutation: {
      y: 675, // Shifted +15px from 660
      font: "italic 600 22px 'Playfair Display', serif",
      color: '#E2007A'
    },
    name: {
      y: 725, // Shifted +15px from 710
      color: '#111111',
      underlineColor: '#00A1C9',
      underlineThickness: 3.5,
      underlineSpacing: 8
    },
    statement: {
      y: 785, // Shifted +15px from 770
      lineHeight: 28,
      color: '#334155',
      highlightColor: '#E2007A',
      orgColor: '#00A1C9'
    }
  },
  
  // Bottom Event Details block
  eventDetails: {
    x: 60, // 800 - 680 / 2
    y: 870, // Shifted +15px from 855
    width: 680,
    height: 95,
    borderColor: 'rgba(0, 161, 201, 0.15)',
    bgColor: '#FFFFFF',
    labelColor: '#E2007A',
    valueColor: '#00A1C9',
    col1X: 100, // Offset from box start
    col2X: 430  // Offset from box start
  },
  
  // Dot decorations positions
  decorations: {
    topRightDots: {
      x: 490,
      y: 40
    },
    bottomLeftDots: {
      x: 45,
      y: 935
    },
    bottomRightCircles: {
      x: 691,
      y: 955
    }
  }
};

// Export if running in a module context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LayoutConfig;
}
