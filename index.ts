function unique<T>(items: Array<T>): Array<T> {
  return items.reduce(
    (sum, item) => {
      if (sum.indexOf(item) !== -1) {
        return sum;
      }

      sum.push(item);

      return sum;
    },
    [] as Array<T>
  );
}

function stringify<T>(obj: T): string {
  if (obj instanceof ImmutableSet || obj instanceof ImmutableVector) {
    return obj.toString();
  }

  return JSON.stringify(obj);
}

type IArrayLike<T> = ImmutableVector<T> | ImmutableSet<T> | Array<T>;

abstract class Collection<K, V> {
  abstract size(): number;
  abstract toString(): string;
  abstract map<O>(mapFn: (item: V, key: K) => O): Collection<K, O>;
  abstract forEach(forEachFn: (item: V, key: K) => any): void;
  abstract filter(filterFn: (item: V, key: K) => boolean): Collection<K, V>;
  abstract find(findFn: (item: V, key: K) => boolean): V | undefined;
  abstract reduce<O>(
    reduceFn: (sum: O, item: V, key: K) => O,
    initialValue: O
  ): O;
}

class ImmutableMap<K, V> extends Collection<K, V> {
  private readonly items: Map<K, V>;

  static from<V>(items: { [key: string]: V }): ImmutableMap<string, V>;
  static from<K, V>(items: Map<K, V>): ImmutableMap<K, V>;
  static from<K, V>(items: ImmutableMap<K, V>): ImmutableMap<K, V>;
  static from<K, V>(
    items: { [key: string]: V } | Map<K, V> | ImmutableMap<K, V>
  ) {
    if (items instanceof ImmutableMap) {
      return items;
    }

    if (items instanceof Map) {
      return new ImmutableMap<K, V>(items);
    }

    const newMap = new Map<string, V>();

    for (const key in items) {
      if (items.hasOwnProperty(key)) {
        newMap.set(key, items[key]);
      }
    }

    return new ImmutableMap<string, V>(newMap);
  }

  constructor(items: Map<K, V> = new Map<K, V>()) {
    super();

    this.items = items;
  }

  size(): number {
    return this.items.size;
  }

  toString(): string {
    const output = this.reduce(
      (sum, v, k) => {
        sum.push(`${stringify(k)}: ${stringify(v)}`);

        return sum;
      },
      [] as Array<string>
    );

    return `map<${output.join(", ")}>`;
  }

  has(key: K): boolean {
    return this.items.has(key);
  }

  get(key: K): V | undefined {
    return this.items.get(key);
  }

  set(key: K, value: V): ImmutableMap<K, V> {
    const dup = new Map<K, V>(this.items);

    dup.set(key, value);

    return new ImmutableMap<K, V>(dup);
  }

  keys(): Array<K> {
    const result: Array<K> = [];

    this.items.forEach((_, key) => result.push(key));

    return result;
  }

  values(): Array<V> {
    const result: Array<V> = [];

    this.items.forEach(value => result.push(value));

    return result;
  }

  map<O>(mapFn: (item: V, key: K) => O): ImmutableMap<K, O> {
    const map = this.keys().reduce((sum, key) => {
      return sum.set(key, mapFn(this.get(key)!, key));
    }, new Map<K, O>());

    return new ImmutableMap<K, O>(map);
  }

  forEach(forEachFn: (value: V, key: K) => any): void {
    this.items.forEach((value, key) => forEachFn(value, key));
  }

  filter(filterFn: (item: V, key: K) => boolean): ImmutableMap<K, V> {
    const map = this.keys().reduce((sum, key) => {
      const value = this.get(key)!;

      if (!filterFn(value, key)) {
        return sum;
      }

      return sum.set(key, value);
    }, new Map<K, V>());

    // Nothing changed.
    if (map.size === this.size()) {
      return this;
    }

    return new ImmutableMap<K, V>(map);
  }

  find(findFn: (value: V, key: K) => boolean): V | undefined {
    for (const [k, v] of this.items) {
      if (findFn(v, k)) {
        return v;
      }
    }
  }

  reduce<O>(reduceFn: (sum: O, item: V, key: K) => O, initialValue: O): O {
    return this.keys().reduce((sum, key) => {
      return reduceFn(sum, this.get(key)!, key);
    }, initialValue);
  }
}

class ImmutableVector<V> extends Collection<number, V> {
  private readonly items: Array<V>;

  static from<V>(items: Array<V> | ImmutableVector<V>) {
    if (items instanceof ImmutableVector) {
      return items;
    }

    return new ImmutableVector<V>(items);
  }

  constructor(items: Array<V> = []) {
    super();

    this.items = items;
  }

  toArray(): Array<V> {
    return this.items;
  }

  join(delimiter: string): string {
    return this.items.map(stringify).join(delimiter);
  }

  toString(): string {
    return `vec<${this.join(",")}>`;
  }

  size(): number {
    return this.items.length;
  }

  get(index: number): V | undefined {
    return this.items[index];
  }

  includes(value: V): boolean {
    return !!this.items.find(i => i === value);
  }

  first(): V | undefined {
    return this.get(0);
  }

  last(): V | undefined {
    return this.get(this.items.length - 1);
  }

  push<V2>(value: V2): ImmutableVector<V | V2> {
    return new ImmutableVector<V | V2>([...this.items, value]);
  }

  pop(): V | undefined {
    const dup: Array<V> = [...this.items];

    const value = dup[dup.length - 1];

    delete dup[dup.length - 1];

    return value;
  }

  unshift<V2>(value: V2): ImmutableVector<V | V2> {
    return new ImmutableVector<V | V2>([value, ...this.items]);
  }

  shift(): V | undefined {
    const dup: Array<V> = [...this.items];

    const value = dup[0];

    delete dup[0];

    return value;
  }

  set<V2>(index: number, value: V2): ImmutableVector<V | V2> {
    if ((this.get(index) as any) === value) {
      return this;
    }

    const dup: Array<V | V2> = [...this.items];

    dup[index] = value;

    return new ImmutableVector<V | V2>(dup);
  }

  update<V2>(
    index: number,
    updaterFn: (currentValue: V | undefined) => V2
  ): ImmutableVector<V | V2> {
    const newValue = updaterFn(this.get(index));
    return this.set(index, newValue);
  }

  delete(index: number): ImmutableVector<V> {
    if (!this.get(index)) {
      return this;
    }

    const dup: Array<V> = [...this.items];

    delete dup[index];

    return new ImmutableVector<V>(dup);
  }

  slice(startIndex: number, endIndex: number): ImmutableVector<V> {
    return new ImmutableVector<V>(this.items.slice(startIndex, endIndex));
  }

  indexOf(value: V): number {
    return this.items.indexOf(value);
  }

  findIndex(findFn: (item: V) => boolean): number {
    return this.items.findIndex(findFn);
  }

  concat<V2>(arrayB: IArrayLike<V2>): ImmutableVector<V | V2> {
    const moreItems =
      arrayB instanceof ImmutableVector || arrayB instanceof ImmutableSet
        ? arrayB.toArray()
        : arrayB;
    return new ImmutableVector<V | V2>([...this.items, ...moreItems]);
  }

  map<O>(mapFn: (item: V, key: number) => O): ImmutableVector<O> {
    return new ImmutableVector(this.items.map(mapFn));
  }

  forEach(forEachFn: (item: V, key: number) => any): void {
    this.items.forEach(forEachFn);
  }

  filter(filterFn: (item: V, key: number) => boolean): ImmutableVector<V> {
    return new ImmutableVector(this.items.filter(filterFn));
  }

  find(findFn: (item: V, key: number) => boolean): V | undefined {
    return this.items.find(findFn);
  }

  reduce<O>(
    reduceFn: (sum: O, item: V, key: number, list: Array<V>) => O,
    initialValue: O
  ): O {
    return this.items.reduce(reduceFn, initialValue);
  }

  unique(): ImmutableVector<V> {
    return new ImmutableVector<V>(unique(this.items));
  }
}

class ImmutableSet<V> extends Collection<number, V> {
  private readonly vector: ImmutableVector<V>;

  static from<V>(items: Array<V> | ImmutableVector<V>) {
    return new ImmutableSet<V>(
      items instanceof ImmutableVector ? items.toArray() : items
    );
  }

  constructor(items: Array<V> | ImmutableVector<V> = []) {
    super();

    const vector =
      items instanceof ImmutableVector ? items : new ImmutableVector(items);

    this.vector = vector.unique();
  }

  toArray(): Array<V> {
    return this.vector.toArray();
  }

  join(delimiter: string): string {
    return this.vector.join(delimiter);
  }

  toString() {
    const stringified = this.map(t => t.toString()).join(",");
    return `set<${this.join(",")}>`;
  }

  size(): number {
    return this.vector.size();
  }

  includes(value: V): boolean {
    return this.vector.includes(value);
  }

  delete(value: V): ImmutableSet<V> {
    const existingIndex = this.vector.indexOf(value);

    if (existingIndex === -1) {
      return this;
    }

    return new ImmutableSet(this.vector.delete(existingIndex));
  }

  concat<V2>(items: IArrayLike<V2>): ImmutableSet<V | V2> {
    const arrayB =
      items instanceof ImmutableVector || items instanceof ImmutableSet
        ? items.toArray()
        : items;

    return new ImmutableSet<V | V2>(this.vector.concat(arrayB));
  }

  forEach<O>(forEachFn: (item: V, key: number) => O): void {
    this.vector.forEach(forEachFn);
  }

  map<O>(mapFn: (item: V, key: number) => O): ImmutableSet<O> {
    return new ImmutableSet(this.vector.map(mapFn));
  }

  filter(filterFn: (item: V, key: number) => boolean): ImmutableSet<V> {
    return new ImmutableSet(this.vector.filter(filterFn));
  }

  find(findFn: (item: V, key: number) => boolean): V | undefined {
    return this.vector.find(findFn);
  }

  reduce<O>(
    reduceFn: (sum: O, item: V, key: number, list: Array<V>) => O,
    initialValue: O
  ): O {
    return this.vector.reduce(reduceFn, initialValue);
  }
}

const map = ImmutableMap.from;
const vector = ImmutableVector.from;
const set = ImmutableSet.from;

type RecordInstance<T> = { readonly [P in keyof T]?: T[P] } & {
  set<K extends keyof T>(key: K, value: T[K]): RecordInstance<T>;
  get<K extends keyof T>(key: K): T[K] | undefined;
};

function record<T extends object>() {
  const makeInstance = (
    data: Partial<T> | ImmutableMap<string, any>
  ): RecordInstance<T> => {
    const baseMap: any = data instanceof ImmutableMap ? data : map(data as any);

    return new Proxy(baseMap, {
      get: function(baseMap, name) {
        if (typeof baseMap[name] !== "undefined") {
          if (name === "set") {
            return <K extends keyof T>(key: K, value: T[K]) => {
              const result = baseMap.set(key, value);
              return result === baseMap ? baseMap : makeInstance(result);
            };
          }

          return baseMap[name];
        }

        return baseMap.get(name);
      }
    }) as any;
  };

  return makeInstance;
}

// Vector of number types
const v1 = vector([1, 2, 3, 4]);
console.log(v1.toString());

// Vector of string types
const v2 = vector(["a", "b", "c", "d"]);
console.log(v2.toString());

// Vector of vector types
const v3 = vector([v1, v1]);
console.log(v3.toString());

// Vector combining 2 different types
const v4 = v1.concat(v2);
console.log(v4.toString());

// Set of number types
const s1 = set([1, 2, 1, 2]);
console.log(s1.toString());

// Set of string types
const s2 = set(["1", "2", "1", "2"]);
console.log(s2.toString());

// Set combining 2 different types
const s3 = s1.concat(s2);
console.log(s3.toString());

// Map of string to number
const m1 = map({
  a: 1,
  b: 2
});
console.log(m1.toString());

// Map based on an ES6 Map
const m2 = map(new Map([["c", 3], ["d", 4]]));
console.log(m2.toString());

// Map with complex, non-string keys
const m3 = map(new Map([[v1, v2]]));
console.log(m3.toString());
console.log(m3.get(v1)!.toString());

// Record def
const person = record<{
  name: string;
  age: number;
  job: RecordInstance<Job>;
}>();

// Subrecord def
type Job = {
  title: string;
};
const job = record<Job>();

// Constructor, with type checked params.
const thomas = person({ name: "Thomas", age: 34, job: job({ title: "TD" }) });
console.log(thomas.toString());
console.log(thomas.job!.title);

// Access via dot, square bracket or getter
console.log(thomas.name);
console.log(thomas["name"]);
console.log(thomas.get("name"));

// Setting
const t2 = thomas.set("name", "test");
console.log(t2.name);
