import { FunctionalComponent } from 'preact';

import { Title } from '@components/Title';
import { Text } from '@components/Text';

import './welcome.css';

export const Welcome: FunctionalComponent = () => {
    return (
        <div class="welcome">
            <Title>Welcome to ONLYOFFICE!</Title>
            <Text>
                This extension helps to view, download and edit files on the webpage. 
                For editing files and viewing version history please Log in using Google account.
            </Text>
        </div>
    );
};
