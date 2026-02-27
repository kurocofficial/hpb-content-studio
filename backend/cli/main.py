"""
HPB Content Studio — 管理者CLIツール
"""
import sys
import os

# プロジェクトルートをPATHに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import click
from cli.commands.org import org
from cli.commands.plan import plan
from cli.commands.import_csv import import_csv


@click.group()
def cli():
    """HPB Content Studio 管理者CLI"""
    pass


cli.add_command(org)
cli.add_command(plan)
cli.add_command(import_csv, name="import")


if __name__ == "__main__":
    cli()
