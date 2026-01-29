import { Component } from 'preact';

import { Title } from '@components/Title';

import { useI18n } from '@stores/i18n';

import errorIcon from '@icons/error.svg';

import '@styles/error.css';

const ErrorMessage = () => {
	const { t, locale } = useI18n();
	const _ = locale.value;
	
	return (
		<div class="error">
			<img src={errorIcon} alt={t('common.error')} class="error__icon" />
			<Title>{t('error.something_went_wrong')}</Title>
		</div>
	);
};

export class ErrorBoundary extends Component {
	state = { error: null };

	static getDerivedStateFromError(error) {
		return { error: error.message };
	}

	render() {
		if (this.state.error)
			return <ErrorMessage />;
		return this.props.children;
	}
}
