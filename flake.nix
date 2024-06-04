{
  inputs  = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };
  outputs = {nixpkgs,self}:
  let
      pkgs = import nixpkgs
      { system = "x86_64-linux"; };
      #lib = pkgs.lib;
      o1js =
        let
          version = "1.3.0";
        in
        pkgs.buildNpmPackage
        {
          pname = "01js";
          inherit version;
          src = pkgs.fetchFromGitHub {
            owner = "o1-labs";
            repo = "o1js";
            rev = "v${version}";
            hash = "sha256-zeoFT2mVGItn7p/72WKbBhfuig/uinc6e0Xqg8dVET4=";
          };
          npmDepsHash = "sha256-m+h1gbthPBpifOSPFyX0IzgG4gr8vhq025uNDMijZns=";
          #npmInstallFlags = [ "--ignore-scripts" ];
          dontNpmBuild = true;
        };
      zkapp-cli =
        let
          version = "0.21.3";
        in
        pkgs.buildNpmPackage
        {
          pname = "zkapp-cli";
          inherit version;
          src = pkgs.fetchFromGitHub {
            owner = "o1-labs";
            repo = "zkapp-cli";
            rev = "v${version}";
            hash = "sha256-QlT7C54PXb7BHBXU9FkoT1PBaO10StQLCxHJFUrPKIA=";
          };
          npmDepsHash = "sha256-FRD7gOGU8n228FW1UgNFvMMcZAITeLkwwZPg0bFQjpc=";
          #npmInstallFlags = [ "--ignore-scripts" ];
          dontNpmBuild = true;
        };
      app = pkgs.buildNpmPackage {
        pname = "my-test-app";
        version = "0";
        src = ./.;
        npmDepsHash = "sha256-xrBML1MXM4KEMyomSUNkqzPksUY0kvnbCEZX5G2uBDM=";
      };
  in
  {
      devShells.x86_64-linux.default = pkgs.mkShell
        {
          inputsFrom = [ app ];
          packages = with pkgs;
            [ nodejs
              nodePackages.npm
              app
              zkapp-cli
              o1js
              typescript
              nodePackages.typescript-language-server
            ];
        };
      packages.x86_64-linux.default = app;
  };
}
