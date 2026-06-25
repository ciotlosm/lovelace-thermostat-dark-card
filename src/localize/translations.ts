export interface Translations {
  // Editor labels
  editor_entity: string;
  editor_name: string;
  editor_theme: string;
  editor_step: string;
  editor_pending: string;
  editor_ambient_temperature: string;
  editor_status_entity: string;
  editor_readonly: string;
  editor_show_power_toggle: string;
  editor_show_preset_indicator: string;
  // Card picker
  card_name: string;
  card_description: string;
}

const en: Translations = {
  editor_entity: 'Entity',
  editor_name: 'Name',
  editor_theme: 'Theme',
  editor_step: 'Step override',
  editor_pending: 'Pending (seconds)',
  editor_ambient_temperature: 'Ambient temperature sensor',
  editor_status_entity: 'Status text entity',
  editor_readonly: 'Read-only mode',
  editor_show_power_toggle: 'Show power toggle',
  editor_show_preset_indicator: 'Show preset indicator',
  card_name: 'Thermostat Dark Card',
  card_description: 'A thermostat card with a round dial — supports dark and light themes',
};

const zhHans: Translations = {
  editor_entity: '实体',
  editor_name: '名称',
  editor_theme: '主题',
  editor_step: '步进覆盖',
  editor_pending: '等待时间（秒）',
  editor_ambient_temperature: '环境温度传感器',
  editor_status_entity: '状态文本实体',
  editor_readonly: '只读模式',
  editor_show_power_toggle: '显示电源开关',
  editor_show_preset_indicator: '显示预设指示器',
  card_name: '恒温器暗色卡片',
  card_description: '带有圆形表盘的恒温器卡片 — 支持深色和浅色主题',
};

const languages: Record<string, Translations> = {
  en,
  'zh-Hans': zhHans,
  zh: zhHans,
  'zh-CN': zhHans,
};

/**
 * Get a localized string. Falls back to English if the language is not supported.
 */
export function localize(key: keyof Translations, language?: string): string {
  const lang = language ?? 'en';
  // Try exact match, then base language, then English
  const translations = languages[lang] ?? languages[lang.split('-')[0]] ?? languages['en'];
  return translations[key] ?? en[key] ?? key;
}
