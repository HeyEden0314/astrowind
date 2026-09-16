import { getPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    { text: '情报', href: getPermalink('/') },
    { text: '来源', href: getPermalink('/sources') },
    { text: '关于', href: getPermalink('/about') },
  ],
  actions: [],
};

export const footerData = {
  links: [
    {
      title: '站点',
      links: [
        { text: '最新情报', href: getPermalink('/') },
        { text: '信息来源', href: getPermalink('/sources') },
        { text: '关于本站', href: getPermalink('/about') },
      ],
    },
    {
      title: '官方博客',
      links: [
        { text: 'OpenAI', href: 'https://openai.com/blog', target: '_blank' },
        { text: 'Anthropic', href: 'https://www.anthropic.com/news', target: '_blank' },
        { text: 'Cursor', href: 'https://cursor.com/blog', target: '_blank' },
        { text: 'xAI', href: 'https://x.ai/blog', target: '_blank' },
      ],
    },
  ],
  secondaryLinks: [],
  socialLinks: [{ ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') }],
  footNote: `
    AI 中文情报站 · 聚合官方 AI 博客并翻译摘要 · 内容版权归各原文作者所有
  `,
};
