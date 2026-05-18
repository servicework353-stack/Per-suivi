
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/docs');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // We have a user but no token in memory (maybe refresh)
        // In AI Studio preview, we usually need to re-sign-in if the session is fresh
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = () => cachedAccessToken;

interface AppDetails {
  tracking_code: string;
  first_name: string;
  last_name: string;
  status: string;
  phone: string;
  license_category: string;
  comment: string;
}

export const createApplicationDoc = async (app: AppDetails, token: string) => {
  // 1. Create a blank document
  const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Rapport Application - ${app.tracking_code}`,
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(`Docs Creation Error: ${error.error?.message || createResponse.statusText}`);
  }

  const doc = await createResponse.json();
  const documentId = doc.documentId;

  // 2. Populate the document with details
  const requests = [
    {
      insertText: {
        location: { index: 1 },
        text: `RAPPORT D'APPLICATION - PERMIS DE CONDUIRE\n\n`,
      },
    },
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex: 45 },
        textStyle: { bold: true, fontSize: { magnitude: 18, unit: 'PT' } },
        fields: 'bold,fontSize',
      },
    },
    {
      insertText: {
        location: { index: 45 },
        text: `Code de suivi : ${app.tracking_code}\n`,
      },
    },
    {
      insertText: {
        location: { index: 45 + app.tracking_code.length + 18 },
        text: `Usager : ${app.first_name} ${app.last_name}\n`,
      },
    },
    {
      insertText: {
        location: { index: 45 + app.tracking_code.length + 18 + app.first_name.length + app.last_name.length + 11 },
        text: `Statut : ${app.status}\n`,
      },
    },
    {
      insertText: {
        location: { index: 45 + app.tracking_code.length + 18 + app.first_name.length + app.last_name.length + 11 + app.status.length + 10 },
        text: `Catégorie : ${app.license_category}\n`,
      },
    },
    {
      insertText: {
        location: { index: 45 + app.tracking_code.length + 18 + app.first_name.length + app.last_name.length + 11 + app.status.length + 10 + app.license_category.length + 13 },
        text: `Téléphone : ${app.phone}\n\n`,
      },
    },
    {
      insertText: {
        location: { index: 45 + app.tracking_code.length + 18 + app.first_name.length + app.last_name.length + 11 + app.status.length + 10 + app.license_category.length + 13 + app.phone.length + 14 },
        text: `COMMENTAIRES ADMIMISTRATION :\n${app.comment || 'Aucun commentaire.'}\n`,
      },
    }
  ];

  const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    throw new Error(`Docs Update Error: ${error.error?.message || updateResponse.statusText}`);
  }

  return `https://docs.google.com/document/d/${documentId}/edit`;
};
