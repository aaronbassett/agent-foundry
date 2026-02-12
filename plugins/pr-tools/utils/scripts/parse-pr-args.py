#!/usr/bin/env python3
"""
parse-pr-args.py
Parse PR arguments with explicit --repo and --pr flags, or infer from context.

Usage:
  parse-pr-args.py                    # Current branch PR
  parse-pr-args.py 123                # PR #123 in current repo
  parse-pr-args.py --pr 123           # PR #123 in current repo
  parse-pr-args.py user/repo 123      # PR #123 in user/repo
  parse-pr-args.py --repo user/repo --pr 123

Output (JSON):
  {
    "repo": "user/repo",
    "pr_number": 123,
    "mode": "current_branch|explicit_pr|explicit_repo"
  }

Exit codes:
  0 - Success
  1 - Invalid arguments
  2 - Could not determine PR or repo from context
"""

import argparse
import json
import subprocess
import sys
from typing import Optional, Dict, Any


def run_gh_command(args: list[str]) -> Optional[str]:
    """Run a gh CLI command and return output, or None on error."""
    try:
        result = subprocess.run(
            ["gh"] + args,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def get_current_branch_pr() -> Optional[int]:
    """Get PR number for current branch."""
    output = run_gh_command(["pr", "view", "--json", "number", "-q", ".number"])
    if output and output.isdigit():
        return int(output)
    return None


def get_current_repo() -> Optional[str]:
    """Get current repository in owner/repo format."""
    return run_gh_command(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"])


def parse_arguments() -> Dict[str, Any]:
    """Parse command line arguments and determine PR context."""
    parser = argparse.ArgumentParser(
        description="Parse PR arguments for pr-tools skills",
        epilog="Examples:\n"
               "  %(prog)s                    # Current branch PR\n"
               "  %(prog)s 123                # PR #123 in current repo\n"
               "  %(prog)s --pr 123           # PR #123 in current repo\n"
               "  %(prog)s user/repo 123      # PR #123 in user/repo\n"
               "  %(prog)s --repo user/repo --pr 123\n",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        "--repo",
        type=str,
        help="Repository in owner/repo format"
    )

    parser.add_argument(
        "--pr",
        type=int,
        metavar="NUMBER",
        help="PR number"
    )

    parser.add_argument(
        "positional",
        nargs="*",
        help="Positional arguments: [repo] pr_number"
    )

    args = parser.parse_args()

    # Determine mode based on arguments
    result = {
        "repo": args.repo,
        "pr_number": args.pr,
        "mode": None
    }

    # Handle positional arguments if no flags provided
    if not args.repo and not args.pr and args.positional:
        if len(args.positional) == 1:
            # Single arg: could be PR number
            try:
                result["pr_number"] = int(args.positional[0])
            except ValueError:
                print(f"Error: Invalid PR number '{args.positional[0]}'", file=sys.stderr)
                sys.exit(1)
        elif len(args.positional) == 2:
            # Two args: repo and PR number
            result["repo"] = args.positional[0]
            try:
                result["pr_number"] = int(args.positional[1])
            except ValueError:
                print(f"Error: Invalid PR number '{args.positional[1]}'", file=sys.stderr)
                sys.exit(1)
        else:
            print("Error: Too many positional arguments", file=sys.stderr)
            print("Usage: parse-pr-args.py [--repo REPO] [--pr NUMBER] [repo] [pr_number]", file=sys.stderr)
            sys.exit(1)

    # Infer missing values from context
    if result["pr_number"] is None:
        # No PR specified, try to get from current branch
        pr_num = get_current_branch_pr()
        if pr_num is None:
            print("❌ No PR found for current branch.", file=sys.stderr)
            print("Create a PR first or specify PR number with --pr or as argument.", file=sys.stderr)
            sys.exit(2)
        result["pr_number"] = pr_num
        result["mode"] = "current_branch"

    if result["repo"] is None:
        # No repo specified, try to get current repo
        repo = get_current_repo()
        if repo is None:
            print("❌ Not in a git repository.", file=sys.stderr)
            print("Specify repository with --repo flag.", file=sys.stderr)
            sys.exit(2)
        result["repo"] = repo

    # Set mode if not already set
    if result["mode"] is None:
        if args.repo or len(args.positional) == 2:
            result["mode"] = "explicit_repo"
        else:
            result["mode"] = "explicit_pr"

    return result


def main():
    """Main entry point."""
    try:
        result = parse_arguments()
        print(json.dumps(result, indent=2))
    except KeyboardInterrupt:
        print("\nInterrupted", file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
