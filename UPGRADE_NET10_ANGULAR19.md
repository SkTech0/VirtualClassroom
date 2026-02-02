# .NET 10 & Angular 19 Upgrade

This project is configured for **.NET 10** and **Angular 19**.

## .NET 10

- **global.json**: SDK `10.0.100` (or latest 10.x with rollForward).
- **All .csproj**: `<TargetFramework>net10.0</TargetFramework>`.
- Backend packages (EF Core, Identity, SignalR, etc.) are on 10.x where available.

No further .NET changes are required.

## Angular 19

The **live-study-room** app has been upgraded from Angular 17 to **Angular 19** in `package.json`:

- All `@angular/*` packages: `^19.0.0`
- `@angular-devkit/build-angular`, `@angular/cli`, `@angular/compiler-cli`: `^19.0.0`
- `zone.js`: `~0.15.0`
- `typescript`: `~5.5.4` (compatible with Angular 19 peer `>=5.5 <5.9`)
- `tslib`: `^2.6.0`

### Install dependencies

From the repo root:

```bash
cd live-study-room
npm install
```

If you see **EACCES** (permission denied) on the npm cache:

```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

### Build and serve

```bash
npm run build    # production build
ng serve         # dev server at http://localhost:4200
```

### Optional: use `ng update` for future patches

To stay on the latest 19.x patches and run migrations:

```bash
cd live-study-room
ng update @angular/core@19 @angular/cli@19
```

## Version summary

| Component        | Version   |
|-----------------|-----------|
| .NET SDK        | 10.0.x    |
| Backend (API)   | net10.0   |
| Angular         | 19.x      |
| TypeScript      | 5.5.x     |
| Zone.js         | 0.15.x    |
