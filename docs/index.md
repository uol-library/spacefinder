---
title: Home
nav_order: 1
---

# Spacefinder

Spacefinder is a map and list of places, built as a Jekyll theme. The
University of Leeds uses it for study spaces at
[spacefinder.leeds.ac.uk](https://spacefinder.leeds.ac.uk/), and it can show
other datasets too, such as buildings or public art. To add a dataset, put
a folder of data in the site and list it in the configuration.

## In this documentation

- **[Project](project/):** where Spacefinder came from, the University of
  Leeds pilot, its features and the development roadmap.
- **[Data models](data-models/):** how places are described with
  schema.org JSON-LD.
- **[Guides](guides/):** configuring the theme, adding a dataset, and
  working on the code.
- **[API](api/):** the core JavaScript modules, generated from the comments
  in the code.

## What is Spacefinder?

Spacefinder is a Ruby on Rails web application developed by the University of Cambridge. It uses a PostgreSQL database to store details for 213 _spaces_ in Cambridge which students may wish to use for study or to meet with others. These range from Bars and pubs to the University’s own coffee shops and libraries.

https://spacefinder.lib.cam.ac.uk/

The application user interface has a list of spaces and shows their location on a map. Users can filter the list of spaces based on noise level, facilities and atmosphere using controlled vocabularies. Spaces are sorted based on their proximity to users (if geolocation of users is possible/permitted). Details for spaces include descriptions, addresses, contact details and opening hours.

## What is this repository?

This repository contains a rewrite of the code in the Cambridge application's UI - the Rails app has been replaced by two JSON data files which load data for all spaces (instead of loading them 35 at a time) and improves filtering and searching by having all the data available and performing all these actions on the client using Javascript.

The project was initiated by the University of Leeds library to explore the possibility of using the Cambridge app in Leeds, but adoption of the full Rails stack was not possible at the time.
