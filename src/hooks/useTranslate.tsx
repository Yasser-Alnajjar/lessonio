import { useTranslations } from 'next-intl';

const useTranslate = (namespace?: string) => {
  return useTranslations(namespace || 'Index');
};
export default useTranslate;
