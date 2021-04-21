/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React, { ErrorInfo } from 'react';
import {
  Alert,
  AlertActionLink,
  AlertVariant,
  PageSection,
  PageSectionVariants,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import Pluralize from 'react-pluralize';
import { DisposableCollection } from '../../services/helpers/disposable';

const RELOAD_TIMEOUT_SEC = 30;

type Props = {};
type State = {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  expanded: boolean;
  activeItems: any;
  shouldReload: boolean;
  reloadAfter: number;
};

export class ErrorBoundary extends React.PureComponent<Props, State> {

  private readonly toDispose = new DisposableCollection();

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      expanded: false,
      activeItems: {},
      shouldReload: false,
      reloadAfter: RELOAD_TIMEOUT_SEC,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      hasError: true,
      error,
      errorInfo,
    });

    if (this.testResourceNotFound(error)) {
      this.setState({
        shouldReload: true,
      });
      this.startCountdown();
    }
  }

  public componentWillUnmount(): void {
    this.toDispose.dispose();
  }

  private testResourceNotFound(error: Error): boolean {
    return /loading chunk [\d]+ failed/i.test(error.message);
  }

  private handleToggleViewStack() {
    const expanded = !this.state.expanded;
    this.setState({
      expanded,
    });
  }

  private handleReloadNow(): void {
    window.location.reload();
  }

  private handleStopCountdown(): void {
    this.toDispose.dispose();
  }

  private startCountdown(): void {
    const id = window.setInterval(() => {
      const reloadAfter = this.state.reloadAfter - 1;
      this.setState({
        reloadAfter,
      });
      if (reloadAfter === 0) {
        this.handleReloadNow();
      }
    }, 1000);

    this.toDispose.push({
      dispose: () => window.clearInterval(id)
    });
  }

  private buildErrorMessageAlert(): React.ReactNode {
    const { error, errorInfo, expanded } = this.state;

    const actionErrorTitle = expanded ? 'Hide stack' : 'View stack';
    const errorName = error?.name ? error.name : Error;
    const errorMessage = error?.message ? ': ' + error.message : '';

    return (
      <Alert
        isInline
        variant={AlertVariant.danger}
        title={errorName + errorMessage}
        actionLinks={
          <AlertActionLink onClick={() => this.handleToggleViewStack()}>
            {actionErrorTitle}
          </AlertActionLink>
        }
      >
        {expanded && errorInfo && (
          <TextContent>
            <Text component={TextVariants.pre}>
              {errorInfo.componentStack}
            </Text>
          </TextContent>
        )}
      </Alert>
    );
  }

  private buildReloadAlert(): React.ReactNode {
    const { reloadAfter, shouldReload: willReload } = this.state;

    if (willReload === false) {
      return;
    }

    return (
      <Alert
        isInline
        variant={AlertVariant.warning}
        title={
          <React.Fragment>
            <span>This page is reloading in&nbsp;</span>
            <Pluralize
              singular={'second'}
              count={reloadAfter}
            />
          </React.Fragment>
        }
        actionLinks={
          <React.Fragment>
            <AlertActionLink onClick={() => this.handleReloadNow()}>
              Reload now
            </AlertActionLink>
            <AlertActionLink onClick={() => this.handleStopCountdown()}>
              Stop countdown
            </AlertActionLink>
          </React.Fragment>
        }
      />
    );
  }

  render(): React.ReactNode {
    const { hasError } = this.state;

    if (!hasError) {
      return this.props.children;
    }

    const errorMessageAlert = this.buildErrorMessageAlert();
    const reloadAlert = this.buildReloadAlert();

    return (
      <PageSection
        variant={PageSectionVariants.light}
        isFilled={true}
      >
        {reloadAlert}
        {errorMessageAlert}
      </PageSection>
    );

  }

}
