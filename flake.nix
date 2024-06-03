{
  inputs  = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };
  outputs = {nixpkgs,self}:
  let
      pkgs = import nixpkgs
      { system = "x86_64-linux"; };
      #lib = pkgs.lib;
      zkapp-cli = pkgs.buildNpmPackage {
        pname = "zkapp-cli";
        version = "v0.21.3";
        src = pkgs.fetchFromGitHub {
          owner = "o1-labs";
          repo = "zkapp-cli";
          rev = "v0.21.3";
          hash = "sha256-QlT7C54PXb7BHBXU9FkoT1PBaO10StQLCxHJFUrPKIA=";
        };
        npmDepsHash = "sha256-FRD7gOGU8n228FW1UgNFvMMcZAITeLkwwZPg0bFQjpc=";
        npmInstallFlags = [ "--ignore-scripts" ];
        dontNpmBuild = true;
      };
      app = pkgs.buildNpmPackage {
        pname = "my-test-app";
        version = "0";
        src = ./.;
        npmDepsHash = "sha256-S8wDY+ZL3QvW83KcXn45BEMe5DQUgoTssM8UwcByqBU=";
      };
  in
  {
      devShell.x86_64-linux = pkgs.mkShell
        {
          inputsFrom = [ app ];
          packages = with pkgs;
            [ nodejs
              nodePackages.npm
              app
              zkapp-cli
            ];
        };
      defaultPackage.x86_64-linux = app;
  };
}
