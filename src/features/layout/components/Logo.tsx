import { FunctionalComponent } from 'preact';

import logoLight from '@icons/logo.svg';
import logoDark from '@icons/logo-dark.svg';

export const Logo: FunctionalComponent = () => {
  const prefersDark = typeof window !== 'undefined'
        && window.matchMedia
        && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const src = prefersDark ? logoDark : logoLight;

  return (
    <div className="header__logo">
      <img
        src={src}
        alt="ONLYOFFICE"
        width="130"
        height="24"
      />
    </div>
  );
};
