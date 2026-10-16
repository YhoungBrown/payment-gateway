# Navigation

This folder is intentionally empty. The template does not enforce a specific navigation library so that developers remain free to choose their own:

- React Navigation
- React Native Navigation (Wix)
- Native Navigation
- or any other solution

## Golden Rule

When wiring screens into your navigator, **always import them from the feature's public API** (`src/features/<name>`), never from internal paths such as `src/features/<name>/screens/ScreenName`.

### Correct

```ts
import {HomeScreen} from '../features/home';
import {ProfileScreen} from '../features/profile';
```

### Incorrect

```ts
import {HomeScreen} from '../features/home/screens/HomeScreen';
import {ProfileScreen} from '../features/profile/screens/ProfileScreen';
```

Deep imports bypass the architecture boundary and will be flagged by the ESLint `boundaries` rules.
