// src/utils/themeHelper.ts

const THEME_ICONS: Record<string, string> = {
  default: 'https://i.ibb.co/732ZpjB/rounded.png',
  sunset: 'https://i.ibb.co/gZ9DBzy3/sunset.png',
  valentine: 'https://i.ibb.co/LHt39ky/valentine.png',
  jungle: 'https://i.ibb.co/0xqP329/jungle.png',
  ocean: 'https://i.ibb.co/ZpFVmXbf/ocean.png',
  cyberpunk: 'https://i.ibb.co/9H6HDvsH/cyberpunk.png',
  midnight: 'https://i.ibb.co/r2VLqntz/midnight.png',
  coffee: 'https://i.ibb.co/7JhYTsKK/coffee.png',
};

export const updateDynamicFavicon = (themeId: string) => {
  const iconUrl = THEME_ICONS[themeId] || THEME_ICONS['default'];
  const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
  
  if (link) {
    link.href = iconUrl;
  }
};