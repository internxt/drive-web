import { Locale } from '../types';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import cn from './cn.json';
import it from './it.json';
import ru from './ru.json';

const locales = {
  [Locale.English]: en,
  [Locale.Spanish]: es,
  [Locale.French]: fr,
  [Locale.Chinese]: cn,
  [Locale.Italian]: it,
  [Locale.Russian]: ru,
};

export default locales;
