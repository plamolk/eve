export default {
  content: ['./public/**/*.html', './public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        blood: { DEFAULT: '#b83227', dark: '#9c2a20' },
        donor: '#2f6fbf', // สีผู้บริจาคในกราฟ (ผ่าน validate_palette คู่กับ blood)
        cream: '#f8f3f0',
        line: '#ebe2de',
        track: '#e6d6d4',
        ink: '#1d1919',
        muted: '#5f5757'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Thonburi', 'Noto Sans Thai Looped', 'Leelawadee UI', 'Tahoma', 'sans-serif']
      }
    }
  }
};
