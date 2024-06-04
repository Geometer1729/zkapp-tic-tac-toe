# Mina zkApp: My Test App

This template uses TypeScript.

To use lightnet you need docker installed
and your user needs to be in the docker group.
```nix
{
  virtualisation.docker.enable = true;
  users.users.${myDevUser}.extraGroups = [ "docker" ];
}
```
This may not take effect on `nixos-rebuild switch`
without rebooting. In this case run `sudo su <myUser>`
and confirm by checking for `docker` in the output of `groups`.

## How to build

```sh
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```

## License

[Apache-2.0](LICENSE)
