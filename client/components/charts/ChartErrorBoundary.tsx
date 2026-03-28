import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Error boundary specifically for chart components.
 * If a lazy-loaded recharts chunk fails to initialize (e.g. TDZ error),
 * this prevents the entire page from going blank.
 */
export default class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ChartErrorBoundary] Chart failed to render:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center h-full w-full min-h-[200px] text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Chart unavailable</p>
              <p className="text-xs opacity-60">
                Try refreshing the page
              </p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
