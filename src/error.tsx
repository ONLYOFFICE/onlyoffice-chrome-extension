import { Component } from 'preact';

import { Title } from '@components/Title';

import errorIcon from '@icons/error.svg';

import '@styles/error.css';

const ErrorMessage = () => {
	return (
		<div class="error">
			<img src={errorIcon} alt="Error" class="error__icon" />
			<Title>Something went wrong</Title>
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
