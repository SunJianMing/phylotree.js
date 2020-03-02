import { range, sum } from "d3";
import seedrandom from 'seedrandom';


function cumsum(vector) {
  var result = [];
  vector.reduce(function(a,b,i) { return result[i] = a+b; }, 0);
  return result;
}

export default function slatkin_maddison(tree, compartments, number_of_iterations, seed) {
  function get_migration_events() {
    compartments.forEach(c => {
      tree.max_parsimony(false, c.name);
    });
    const migration_events = [];
    var event, transition_occurred;
    tree.traverse_and_compute(function(node) {
      if(node.parent) {
        transition_occurred = node.data.trait != node.parent.data.trait;
        if(transition_occurred) {
          event = {};
          event[node.data.name] = {
            from: node.parent.data.trait,
            to: node.data.trait
          }
          migration_events.push(event);
        }
      }
    });
    return migration_events;
  }

  // Initial phase
  const total_number_of_leaves = tree.get_tips().length;
  const true_migration_events = get_migration_events(tree),
    true_number_of_migrations = true_migration_events.length;

  // Bootstrap
  const bootstrap_counts = range(total_number_of_leaves).map(d=>0),
    trait_probabilities = compartments.map(c => c.count/total_number_of_leaves),
    cdf = cumsum(trait_probabilities);
  var trait_index;
  const rng = seedrandom(seed);
  for(let i=0; i < number_of_iterations; i++) {
    tree.get_tips().forEach(function(node) {
      trait_index = cdf.map(p => rng() < p).indexOf(true);
      node.data.trait = compartments[trait_index].name;
    });
    var number_of_transitions = get_migration_events(tree).length;
    bootstrap_counts[number_of_transitions]++;
  }
  const p_value = sum(bootstrap_counts.slice(0, true_number_of_migrations))/number_of_iterations;
  return {
    p_value: p_value,
    bootstrap_transitions: bootstrap_counts,
    migrations: true_migration_events,
    number_of_migrations: true_migration_events.length,
    updated_newick: tree.get_newick()
  };
}
