import { FunctionalComponent } from 'preact';

import logoSvg from '@icons/logo.svg';

export const Logo: FunctionalComponent = () => {
    return (
        <div class="header__logo">
            <img 
                src={logoSvg} 
                alt="ONLYOFFICE" 
                width="130" 
                height="24"
            />
        </div>
    );
};
