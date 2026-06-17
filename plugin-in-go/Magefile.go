//go:build mage

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

const binaryName = "gpx_itguy-datadog-monitors-datasource"

// Default builds a backend binary for the current operating system and architecture.
var Default = Build

// Build builds the backend binary for the current operating system and architecture.
func Build() error {
	return build(runtime.GOOS, runtime.GOARCH)
}

// Linux builds the backend binary for linux/amd64, which is the common Grafana Linux target.
func Linux() error {
	return build("linux", "amd64")
}

// LinuxARM64 builds the backend binary for linux/arm64.
func LinuxARM64() error {
	return build("linux", "arm64")
}

func build(goos, goarch string) error {
	if err := os.MkdirAll("dist", 0o755); err != nil {
		return err
	}

	outputName := fmt.Sprintf("%s_%s_%s", binaryName, goos, goarch)
	if goos == "windows" {
		outputName += ".exe"
	}

	outputPath := filepath.Join("dist", outputName)
	cmd := exec.Command("go", "build", "-trimpath", "-ldflags", "-s -w", "-o", outputPath, "./pkg")
	cmd.Env = append(os.Environ(), "GOOS="+goos, "GOARCH="+goarch, "CGO_ENABLED=0")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return err
	}

	if err := os.Chmod(outputPath, 0o755); err != nil {
		return err
	}

	// App plugins with nested data sources may resolve the executable either from
	// the app dist root or from the nested datasource directory depending on the
	// Grafana/plugin-tooling path used during packaging. Keeping a copy in both
	// locations makes the package resilient for private/internal builds.
	nestedDir := filepath.Join("dist", "datasource")
	if err := os.MkdirAll(nestedDir, 0o755); err != nil {
		return err
	}
	nestedOutputPath := filepath.Join(nestedDir, outputName)
	if err := copyFile(outputPath, nestedOutputPath); err != nil {
		return err
	}

	return os.Chmod(nestedOutputPath, 0o755)
}

func copyFile(source string, destination string) error {
	input, err := os.ReadFile(source)
	if err != nil {
		return err
	}
	return os.WriteFile(destination, input, 0o755)
}
