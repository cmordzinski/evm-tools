import logging
import logging.handlers
import requests
import pathlib
import configparser
import sys
import os
import json


def read_json_conf(path):
    """Configure a logging.Logger object, logs to stdout and syslog.

    Args:
        log_name (str): Desired name of the logger/log file

    Returns:
        logging.Logger object
    """

    config_file = f"{path}"
    try:
        with open(config_file, "r") as config_data:
            data = config_data.read()
            config = json.loads(data)
    except Exception as e:
        print(f"Couldn't parse file: {config_file} - {e}")
        sys.exit(1)

    return config


def configure_logger(log_name):
    """Configure a logging.Logger object, logs to stdout and syslog.

    Args:
        log_name (str): Desired name of the logger/log file

    Returns:
        logging.Logger object
    """
    logger = logging.getLogger(f"{log_name}")
    logger.setLevel(logging.INFO)
    logger.propagate = False

    sh = logging.StreamHandler(sys.stdout)
    lh = logging.handlers.SysLogHandler()

    fmtstr = "[%(asctime)s] %(levelname)s [%(name)s] %(message)s"
    formatter = logging.Formatter(fmtstr, datefmt="%a, %d %b %Y %H:%M:%S")

    sh.setFormatter(formatter)
    lh.setFormatter(formatter)

    logger.addHandler(sh)
    logger.addHandler(lh)

    return logger


def send_discord_message(message, webhook, embed=None, logger=None):
    """Send a discord message to a webhook.

    Args:
        message (str): Message to send
        webhook (str): Webhook to send the message to
        embed (dict): Optional embed to format the message
        logger (Logger): Optional logger instance to log to

    Returns:
        status/error code from post request of the message
    """

    data = {"content": message}

    if embed:
        data["embeds"] = [embed]

    result = requests.post(webhook, json=data)

    try:
        return result.raise_for_status()
    except requests.exceptions.HTTPError as err:
        if logger:
            logger.error(err)
        else:
            print(err)
