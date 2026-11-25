import { Component, Fragment, useState, type ErrorInfo, type ReactNode } from 'react';
import { navigate } from '../app/router';
import { Button } from './Button';

interface Props {
  /** Change à chaque navigation : on repart sans erreur sur le nouvel écran. */
  resetKey: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  resetKey: string;
  /** Incrémenté par « Réessayer » : l'écran est remonté à neuf. */
  attempt: number;
  details: string;
}

function describe(error: Error, componentStack?: string | null): string {
  const title = `${error.name}: ${error.message}`;
  // Chrome commence la pile par le message ; Firefox et Safari non.
  return [
    error.stack?.startsWith(title) ? error.stack : [title, error.stack].filter(Boolean).join('\n'),
    componentStack && `Composants :${componentStack}`,
    `Adresse : ${window.location.hash || '#/'}`,
    `Navigateur : ${navigator.userAgent}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** Détail technique repliable, à copier pour le signaler. Rien n'est envoyé. */
function Details({ text }: { text: string }) {
  const [copied, setCopied] = useState('');
  return (
    <details className="oops__details">
      <summary>Détail technique</summary>
      <pre className="oops__trace" tabIndex={0}>
        {text}
      </pre>
      <Button
        variant="ghost"
        onClick={() =>
          navigator.clipboard
            ?.writeText(text)
            .then(() => setCopied('Détail copié.'))
            .catch(() => setCopied('Copie impossible : sélectionner le texte à la main.'))
        }
      >
        Copier le détail
      </Button>
      <p className="muted" role="status">
        {copied}
      </p>
    </details>
  );
}

function Oops({ details, onRetry }: { details: string; onRetry: () => void }) {
  return (
    <main className="screen oops">
      <p className="oops__emoji" aria-hidden="true">
        🙈
      </p>
      <h1 className="h1">Oups !</h1>
      <p className="lead">
        Quelque chose s’est mal passé. Ce n’est la faute de personne : on peut réessayer. Les
        étoiles déjà gagnées sont gardées.
      </p>
      <div className="oops__actions">
        <Button block onClick={onRetry}>
          Réessayer
        </Button>
        <Button
          variant="secondary"
          block
          onClick={() => {
            // Déjà sur l'accueil : l'adresse ne change pas, on remonte l'écran.
            onRetry();
            navigate('/');
          }}
        >
          Accueil
        </Button>
      </div>
      <Details text={details} />
    </main>
  );
}

/**
 * Barrière d'erreur autour des écrans : une exception au rendu affiche l'écran « Oups »
 * au lieu d'une page blanche. Aucune donnée n'est envoyée nulle part.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey, attempt: 0, details: '' };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Autre écran : l'erreur de l'écran précédent ne compte plus.
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ details: describe(error, info.componentStack) });
  }

  retry = () => this.setState((s) => ({ error: null, details: '', attempt: s.attempt + 1 }));

  render() {
    const { error, details, attempt } = this.state;
    if (error) return <Oops details={details || describe(error)} onRetry={this.retry} />;
    return <Fragment key={attempt}>{this.props.children}</Fragment>;
  }
}
