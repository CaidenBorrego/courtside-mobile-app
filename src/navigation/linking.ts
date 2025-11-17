import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { RootStackParamList } from '../types';

const prefix = Linking.createURL('/');

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'courtside://', 'https://courtside.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
        },
      },
      Main: {
        screens: {
          Home: 'home',
          Profile: 'profile',
        },
      },
      TournamentDetail: {
        path: 'tournament/:tournamentId',
        parse: {
          tournamentId: (tournamentId: string) => tournamentId,
        },
      },
      GameDetail: {
        path: 'game/:gameId',
        parse: {
          gameId: (gameId: string) => gameId,
        },
      },
    },
  },
};

export default linking;
