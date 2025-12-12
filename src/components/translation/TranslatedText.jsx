import { useAutoTranslate } from '../../hooks/useTranslate';

export function TranslatedText({ text, sourceLang = null, children, as: Component = 'span', ...props }) {
  const translatedText = useAutoTranslate(text || children, sourceLang);

  return <Component {...props}>{translatedText}</Component>;
}
