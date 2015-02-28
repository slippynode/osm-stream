#!/usr/bin/env node

var program = require('commander')
  , async = require('async')
  , queue
;

program
  .version('0.0.1')
  .option('-c, --connect [value]', 'PostgreSQL connection string')
  .parse(process.argv)
;

queue = [];
if (program.connect) queue.push(lineStreams);
async.series(queue);

function lineStreams () {
  async.waterfall([
    function (callback) {
      var knex = require('knex')({
        client: 'pg',
        connection: program.connect,
      });
      callback(null, knex);
    },
    function (knex) {
      var stream = knex.select([
          'osm_id',
          'highway',
          'route',
          'name',
          knex.raw('ST_AsGeoJSON(ST_Transform(way,4326)) as json_start_pt'),
          knex.raw('ST_AsGeoJSON(ST_Transform(way,4326)) as json_end_pt'),
          knex.raw('ST_AsGeoJSON(ST_Transform(way,4326)) as json_line'),
          knex.raw('ST_Transform(way,4326) as geom_start_pt'),
          knex.raw('ST_Transform(way,4326) as geom_end_pt'),
          knex.raw('ST_Transform(way,4326) as geom_line'),
          knex.raw('ST_Length(way) as length_meters'),
          knex.raw('ST_Length(way) / 1000 as length_kilometers'),
          knex.raw('ST_Length(way) * 3.28084 as length_feet'),
          knex.raw('ST_Length(way) / 1609.34 as length_miles')
        ])
        .from('planet_osm_line')
        .where(function () {
          this.where({'highway': 'path'})
          .orWhere({'highway': 'footway'})
          .orWhere({'highway': 'track'})
          .orWhere({'route': 'hiking'})
        })
        .whereNotNull('name')
        .stream()
      ;

//      stream.setEncoding('utf8');

      stream.on('error', function (error) {
        process.stdout.write(error);
        process.exit(1);
      });

      stream.on('data', function (chunk) {
//        process.stdout.write(chunk);
          console.log(chunk);
      });

      stream.on('end', function () {
        process.exit(0);
      });
    }
  ], function (error) {
    process.stdout.write(error);
  });
};