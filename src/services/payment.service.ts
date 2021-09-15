import { generateMnemonic } from 'bip39';
import { getHeaders } from '../lib/auth';
import { encryptPGP } from '../lib/utilspgp';
import { StripeSessionMode, Workspace } from '../models/enums';
import envService from './env.service';
import httpService from './http.service';

export interface CreatePaymentSessionPayload {
  test?: boolean;
  mode: StripeSessionMode;
  priceId: string;
  successUrl?: string;
  canceledUrl?: string;
}

export interface CreateTeamsPaymentSessionPayload {
  test?: boolean;
  mode: StripeSessionMode;
  priceId: string;
  quantity: number;
  mnemonicTeam: string;
  successUrl?: string;
  canceledUrl?: string;
}

const stripe = window.Stripe(
  !envService.isProduction() ? process.env.REACT_APP_STRIPE_TEST_PK : process.env.REACT_APP_STRIPE_PK,
);

const paymentService = {
  async createSession(body: CreatePaymentSessionPayload): Promise<any> {
    const response = await httpService.post<CreatePaymentSessionPayload, unknown>(
      `${process.env.REACT_APP_API_URL}/api/v2/stripe/session`,
      body,
      {
        authWorkspace: Workspace.Individuals,
      },
    );

    return response;
  },

  async redirectToCheckout(options: stripe.StripeServerCheckoutOptions): Promise<{ error: stripe.Error }> {
    return stripe.redirectToCheckout(options);
  },

  // TODO: refactor as individual
  async handlePaymentTeams(priceId: string, quantity: number, mode: StripeSessionMode): Promise<void> {
    const mnemonicTeam = generateMnemonic(256);
    const encMnemonicTeam = await encryptPGP(mnemonicTeam);
    const codMnemonicTeam = Buffer.from(encMnemonicTeam.data).toString('base64');
    const payload: CreateTeamsPaymentSessionPayload = {
      mode,
      priceId,
      quantity,
      mnemonicTeam: codMnemonicTeam,
      test: !envService.isProduction(),
    };

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/stripe/teams/session`, {
      method: 'POST',
      headers: getHeaders(true, false),
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .catch((err) => {
        console.error('Error starting Stripe session. Reason: %s', err);
        throw err;
      });

    if (response.error) {
      throw Error(response.error);
    }

    await stripe.redirectToCheckout({ sessionId: response.id });
  },
};

export default paymentService;
