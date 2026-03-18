import math
import os
import re
import tkinter as tk


LINK_PATTERN = re.compile(r"\[[^\]]*?\]\(([^)]+)\)")
TREE_ROOT_NAME = "ai-context-tree"
WINDOW_WIDTH = 1440
WINDOW_HEIGHT = 920
BACKGROUND = "#07111d"
PANEL = "#0f1b2a"
SIDEBAR = "#0b1622"
TEXT = "#d9ecff"
FILE_COLOR = "#7dd3fc"
DIR_COLOR = "#9ae6b4"
HIERARCHY_COLOR = "#5ea6ff"
REFERENCE_COLOR = "#ffb05e"
MUTED_FILE_COLOR = "#35566a"
MUTED_DIR_COLOR = "#3f5e50"
MUTED_LINK_COLOR = "#233547"
SELECTED_COLOR = "#f8d66d"


def to_posix(path_value):
    return path_value.replace("\\", "/")


def build_graph(root_dir):
    nodes = []
    hierarchy_links = []
    reference_links = []
    known_paths = set()
    collapsed_readme_targets = {}

    def walk(current_path, parent_id=None, depth=0):
        base_name = os.path.basename(current_path)

        if base_name == "__pycache__":
            return

        if os.path.isfile(current_path) and base_name.lower().endswith(".py"):
            return

        if os.path.isfile(current_path) and base_name.lower().endswith(".pyc"):
            return

        if os.path.isfile(current_path) and os.path.basename(current_path).lower() == "readme.md":
            directory_relative_path = to_posix(
                os.path.relpath(os.path.dirname(current_path), start=os.path.dirname(root_dir))
            )
            readme_relative_path = to_posix(os.path.relpath(current_path, start=os.path.dirname(root_dir)))
            collapsed_readme_targets[readme_relative_path] = directory_relative_path
            return

        relative_path = to_posix(os.path.relpath(current_path, start=os.path.dirname(root_dir)))
        name = os.path.basename(current_path)
        kind = "directory" if os.path.isdir(current_path) else "file"

        node = {
            "id": relative_path,
            "name": name,
            "path": relative_path,
            "kind": kind,
            "depth": depth,
        }
        nodes.append(node)
        known_paths.add(relative_path)

        if parent_id:
            hierarchy_links.append({
                "source": parent_id,
                "target": relative_path,
                "kind": "hierarchy",
            })

        if not os.path.isdir(current_path):
            return

        for child_name in sorted(os.listdir(current_path)):
            walk(os.path.join(current_path, child_name), relative_path, depth + 1)

    def resolve_reference(from_file_path, raw_target):
        if not raw_target:
            return None

        if raw_target.startswith("http") or raw_target.startswith("mailto:"):
            return None

        raw_target = raw_target.split("#", 1)[0]
        if not raw_target:
            return None

        absolute_target = os.path.normpath(os.path.join(os.path.dirname(from_file_path), raw_target))
        relative_target = to_posix(os.path.relpath(absolute_target, start=os.path.dirname(root_dir)))

        if not relative_target.startswith(TREE_ROOT_NAME + "/"):
            return None

        if relative_target in collapsed_readme_targets:
            relative_target = collapsed_readme_targets[relative_target]

        if relative_target not in known_paths:
            return None

        return relative_target

    walk(root_dir)

    for node in nodes:
        if node["kind"] != "file" or not node["path"].endswith(".md"):
            continue

        absolute_path = os.path.join(os.path.dirname(root_dir), node["path"].replace("/", os.sep))

        if node["kind"] == "directory":
            readme_path = os.path.join(absolute_path, "README.md")
            if not os.path.exists(readme_path):
                continue
            with open(readme_path, "r", encoding="utf-8") as handle:
                content = handle.read()
            reference_base_path = readme_path
        else:
            with open(absolute_path, "r", encoding="utf-8") as handle:
                content = handle.read()
            reference_base_path = absolute_path

        seen_targets = set()
        for match in LINK_PATTERN.finditer(content):
            target = resolve_reference(reference_base_path, match.group(1))
            if not target or target == node["path"] or target in seen_targets:
                continue

            seen_targets.add(target)
            reference_links.append({
                "source": node["path"],
                "target": target,
                "kind": "reference",
            })

    return nodes, hierarchy_links + reference_links


def build_layout(nodes, links, horizontal_gap=102.0, level_height=132.0):
    node_lookup = dict((node["id"], node) for node in nodes)
    children_by_parent = {}
    reference_degree = {}
    incoming_reference_degree = {}
    child_count = {}

    for node in nodes:
        reference_degree[node["id"]] = 0
        incoming_reference_degree[node["id"]] = 0
        child_count[node["id"]] = 0
        if node["depth"] == 0:
            continue
        parent_id = to_posix(os.path.dirname(node["path"]))
        children_by_parent.setdefault(parent_id, []).append(node)

    for parent_id, children in children_by_parent.items():
        child_count[parent_id] = len(children)

    for link in links:
        if link["kind"] != "reference":
            continue
        reference_degree[link["source"]] = reference_degree.get(link["source"], 0) + 1
        incoming_reference_degree[link["target"]] = incoming_reference_degree.get(link["target"], 0) + 1

    subtree_widths = {}

    def subtree_width(node_id):
        children = sorted(children_by_parent.get(node_id, []), key=lambda item: item["path"])
        if not children:
            subtree_widths[node_id] = 1.0
            return 1.0

        width = 0.0
        for child in children:
            width += subtree_width(child["id"])

        subtree_widths[node_id] = max(1.0, width)
        return subtree_widths[node_id]

    root_node = next(node for node in nodes if node["depth"] == 0)
    subtree_width(root_node["id"])

    positioned = []
    def node_z(node):
        ref_score = reference_degree.get(node["id"], 0)
        incoming_score = incoming_reference_degree.get(node["id"], 0)
        child_score = child_count.get(node["id"], 0)
        is_hub = node["kind"] == "directory" or node["name"].lower() == "readme.md"

        importance = (child_score * 2.4) + (ref_score * 1.7) + (incoming_score * 1.2)
        if is_hub:
            importance += 2.0

        if node["depth"] == 0:
            return 0.0

        branch_seed = sum(ord(char) for char in node["id"])
        sign = -1.0 if branch_seed % 2 == 0 else 1.0

        base_offset = min(180.0, importance * 11.0)
        depth_pull = max(0.0, 42.0 - (node["depth"] * 6.0))

        if is_hub:
            return sign * max(10.0, base_offset * 0.28)

        return sign * max(18.0, base_offset + depth_pull)

    def place(node_id, center_x):
        node = node_lookup[node_id]
        children = sorted(children_by_parent.get(node_id, []), key=lambda item: item["path"])

        positioned.append({
            "id": node["id"],
            "name": node["name"],
            "path": node["path"],
            "kind": node["kind"],
            "depth": node["depth"],
            "x": center_x,
            "y": node["depth"] * level_height,
            "z": node_z(node),
        })

        if not children:
            return

        total_width = 0.0
        for child in children:
            total_width += subtree_widths[child["id"]]

        cursor = center_x - ((total_width - 1.0) * horizontal_gap / 2.0)
        for child in children:
            child_width = subtree_widths[child["id"]]
            child_center = cursor + ((child_width - 1.0) * horizontal_gap / 2.0)

            # Keep markdown/file leaves tucked closer to their parent directory
            # while preserving broader spacing for directory branches.
            if child["kind"] == "file":
                child_center = center_x + ((child_center - center_x) * 0.45)

            place(child["id"], child_center)
            cursor += child_width * horizontal_gap

    place(root_node["id"], 0.0)
    return positioned


def node_radius(node):
    base_radius = 7.0 if node["kind"] == "directory" else 4.6

    if node["depth"] == 0:
        base_radius = 16.0
    elif node["kind"] == "directory" and node["depth"] == 1:
        base_radius = 11.0
    elif node["kind"] == "directory" and node["depth"] == 2:
        base_radius = 8.6

    return max(3.0, base_radius * node["scale"])


def label_offset(node):
    seed = sum(ord(char) for char in node["id"])
    horizontal = 6 + ((seed % 3) * 6)
    vertical = -10 + (((seed // 3) % 4) * 7)
    return horizontal, vertical


class TreeViewer(object):
    def __init__(self, root_dir):
        self.root_dir = root_dir
        self.nodes, self.links = build_graph(root_dir)
        self.horizontal_gap = 40.0
        self.level_height = 128.0
        self.positioned_nodes = build_layout(
            self.nodes,
            self.links,
            horizontal_gap=self.horizontal_gap,
            level_height=self.level_height,
        )
        self.positioned_lookup = dict((node["id"], node) for node in self.positioned_nodes)
        self.node_lookup = dict((node["id"], node) for node in self.nodes)
        self.parent_lookup = {}
        self.children_lookup = {}
        for node in self.nodes:
            if node["depth"] == 0:
                continue
            parent_id = to_posix(os.path.dirname(node["path"]))
            self.parent_lookup[node["id"]] = parent_id
            self.children_lookup.setdefault(parent_id, []).append(node["id"])
        self.projected_by_id = {}
        self.selected_node_id = self.nodes[0]["id"] if self.nodes else None
        self.manual_offsets = {}

        self.rotation_x = -0.48
        self.rotation_y = 0.0
        self.zoom = 1540.0
        self.pan_x = 0.0
        self.pan_y = 0.0
        self.dragging = False
        self.node_dragging = False
        self.drag_node_id = None
        self.panning = False
        self.drag_moved = False
        self.last_x = 0
        self.last_y = 0

        self.root = tk.Tk()
        self.root.title("AI Context Tree Viewer")
        self.root.geometry("%dx%d" % (WINDOW_WIDTH, WINDOW_HEIGHT))
        self.root.configure(bg=BACKGROUND)

        self.canvas = tk.Canvas(
            self.root,
            width=WINDOW_WIDTH,
            height=WINDOW_HEIGHT,
            bg=BACKGROUND,
            highlightthickness=0,
        )
        self.canvas.pack(fill="both", expand=True)

        self.canvas.bind("<ButtonPress-1>", self.on_press)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)
        self.canvas.bind("<ButtonPress-3>", self.on_pan_press)
        self.canvas.bind("<B3-Motion>", self.on_pan_drag)
        self.canvas.bind("<ButtonRelease-3>", self.on_pan_release)
        self.canvas.bind("<MouseWheel>", self.on_mousewheel)
        self.canvas.bind("<Button-4>", self.on_mousewheel)
        self.canvas.bind("<Button-5>", self.on_mousewheel)
        self.root.bind("f", self.on_fit_key)
        self.root.bind("F", self.on_fit_key)
        self.root.bind("[", self.on_narrower)
        self.root.bind("]", self.on_wider)
        self.root.bind("<Configure>", self.on_resize)

        self.build_panels()
        self.fit_view(WINDOW_WIDTH, WINDOW_HEIGHT)
        self.select_node(self.selected_node_id, focus=False)
        self.redraw()

    def build_panels(self):
        self.title_var = tk.StringVar()
        self.meta_var = tk.StringVar()

        self.left_panel = tk.Frame(self.root, bg=SIDEBAR, width=430, height=300)
        self.left_panel.place(x=18, y=WINDOW_HEIGHT - 332, width=430, height=300)

        tk.Label(
            self.left_panel,
            text="Selected Node",
            bg=SIDEBAR,
            fg=TEXT,
            font=("Consolas", 16, "bold"),
            anchor="w",
        ).pack(fill="x", padx=14, pady=(14, 2))

        tk.Label(
            self.left_panel,
            textvariable=self.title_var,
            bg=SIDEBAR,
            fg=TEXT,
            font=("Consolas", 12, "bold"),
            anchor="w",
            justify="left",
            wraplength=390,
        ).pack(fill="x", padx=14)

        tk.Label(
            self.left_panel,
            textvariable=self.meta_var,
            bg=SIDEBAR,
            fg="#93b7d3",
            font=("Consolas", 10),
            anchor="w",
            justify="left",
            wraplength=390,
        ).pack(fill="x", padx=14, pady=(4, 10))

        self.text_frame = tk.Frame(self.left_panel, bg=SIDEBAR)
        self.text_frame.pack(fill="both", expand=True, padx=14, pady=(0, 10))

        self.text_widget = tk.Text(
            self.text_frame,
            wrap="word",
            bg=PANEL,
            fg=TEXT,
            insertbackground=TEXT,
            relief="flat",
            font=("Consolas", 10),
        )
        self.text_scroll = tk.Scrollbar(self.text_frame, command=self.text_widget.yview)
        self.text_widget.configure(yscrollcommand=self.text_scroll.set)
        self.text_widget.pack(side="left", fill="both", expand=True)
        self.text_scroll.pack(side="right", fill="y")

        controls_frame = tk.Frame(self.left_panel, bg=SIDEBAR)
        controls_frame.pack(fill="x", padx=14, pady=(0, 10))

        tk.Button(
            controls_frame,
            text="Narrower",
            command=lambda: self.on_narrower(None),
            bg=PANEL,
            fg=TEXT,
            relief="flat",
            activebackground="#21435f",
            activeforeground=TEXT,
            font=("Consolas", 10),
        ).pack(side="left")

        tk.Button(
            controls_frame,
            text="Wider",
            command=lambda: self.on_wider(None),
            bg=PANEL,
            fg=TEXT,
            relief="flat",
            activebackground="#21435f",
            activeforeground=TEXT,
            font=("Consolas", 10),
        ).pack(side="left", padx=(8, 0))

        tk.Button(
            controls_frame,
            text="Fit",
            command=lambda: self.on_fit_key(None),
            bg=PANEL,
            fg=TEXT,
            relief="flat",
            activebackground="#21435f",
            activeforeground=TEXT,
            font=("Consolas", 10),
        ).pack(side="left", padx=(8, 0))

        tk.Button(
            controls_frame,
            text="Reset Drag",
            command=lambda: self.on_reset_drag(None),
            bg=PANEL,
            fg=TEXT,
            relief="flat",
            activebackground="#21435f",
            activeforeground=TEXT,
            font=("Consolas", 10),
        ).pack(side="left", padx=(8, 0))

        self.right_panel = tk.Frame(self.root, bg=SIDEBAR, width=360, height=300)
        self.right_panel.place(x=WINDOW_WIDTH - 378, y=WINDOW_HEIGHT - 332, width=360, height=300)

        tk.Label(
            self.right_panel,
            text="Quick Access",
            bg=SIDEBAR,
            fg=TEXT,
            font=("Consolas", 16, "bold"),
            anchor="w",
        ).pack(fill="x", padx=14, pady=(14, 8))

        self.quick_access_container = tk.Frame(self.right_panel, bg=SIDEBAR)
        self.quick_access_container.pack(fill="both", expand=True, padx=14, pady=(0, 14))

        self.quick_access_list = tk.Listbox(
            self.quick_access_container,
            bg=PANEL,
            fg=TEXT,
            selectbackground="#21435f",
            selectforeground=TEXT,
            relief="flat",
            activestyle="none",
            font=("Consolas", 10),
            bd=0,
            highlightthickness=0,
        )
        self.quick_access_scroll = tk.Scrollbar(
            self.quick_access_container,
            orient="vertical",
            command=self.quick_access_list.yview,
        )
        self.quick_access_list.configure(yscrollcommand=self.quick_access_scroll.set)
        self.quick_access_list.pack(side="left", fill="both", expand=True)
        self.quick_access_scroll.pack(side="right", fill="y")
        self.quick_access_list.bind("<<ListboxSelect>>", self.on_quick_access_select)
        self.quick_access_node_ids = []
        self.quick_access_header_rows = set()

    def render_quick_access_cards(self, sections):
        self.quick_access_list.delete(0, tk.END)
        self.quick_access_node_ids = []
        self.quick_access_header_rows = set()
        row_index = 0

        for title, node_ids in sections:
            if not node_ids:
                continue

            self.quick_access_list.insert(tk.END, title.upper())
            self.quick_access_node_ids.append(None)
            self.quick_access_header_rows.add(row_index)
            self.quick_access_list.itemconfig(row_index, bg=SIDEBAR, fg=SELECTED_COLOR)
            row_index += 1

            for node_id in node_ids[:6]:
                node = self.node_lookup[node_id]
                self.quick_access_list.insert(tk.END, "  %s" % node["name"])
                self.quick_access_node_ids.append(node_id)
                self.quick_access_list.itemconfig(row_index, bg="#142232", fg=TEXT)
                row_index += 1

                self.quick_access_list.insert(tk.END, "    %s" % node["path"])
                self.quick_access_node_ids.append(node_id)
                self.quick_access_list.itemconfig(row_index, bg="#142232", fg="#8eb3cf")
                row_index += 1

                self.quick_access_list.insert(tk.END, "")
                self.quick_access_node_ids.append(None)
                self.quick_access_list.itemconfig(row_index, bg=SIDEBAR, fg=SIDEBAR)
                row_index += 1

        self.quick_access_list.yview_moveto(0)

    def rotate(self, node):
        offset_x, offset_y, offset_z = self.accumulated_offset(node["id"])
        world_x = node["x"] + offset_x
        world_y = node["y"] + offset_y
        world_z = node["z"] + offset_z
        cos_y = math.cos(self.rotation_y)
        sin_y = math.sin(self.rotation_y)
        cos_x = math.cos(self.rotation_x)
        sin_x = math.sin(self.rotation_x)

        x1 = world_x * cos_y - world_z * sin_y
        z1 = world_x * sin_y + world_z * cos_y
        y1 = world_y * cos_x - z1 * sin_x
        z2 = world_y * sin_x + z1 * cos_x

        return x1, y1, z2

    def accumulated_offset(self, node_id):
        total_x = 0.0
        total_y = 0.0
        total_z = 0.0
        current_id = node_id

        while current_id:
            offset = self.manual_offsets.get(current_id)
            if offset:
                total_x += offset.get("x", 0.0)
                total_y += offset.get("y", 0.0)
                total_z += offset.get("z", 0.0)
            current_id = self.parent_lookup.get(current_id)

        return total_x, total_y, total_z

    def hit_test_node(self, x, y):
        closest_id = None
        closest_distance = None

        for node_id, projected in self.projected_by_id.items():
            radius = node_radius(projected) + 8.0
            distance = math.sqrt(
                ((projected["screen_x"] - x) ** 2) + ((projected["screen_y"] - y) ** 2)
            )
            if distance <= radius and (closest_distance is None or distance < closest_distance):
                closest_id = node_id
                closest_distance = distance

        return closest_id

    def project(self, node, width, height):
        x1, y1, z2 = self.rotate(node)
        scale = self.zoom / (self.zoom + z2 + 260.0)
        return {
            "id": node["id"],
            "name": node["name"],
            "kind": node["kind"],
            "depth": node["depth"],
            "screen_x": x1 * scale + (width / 2.0) + self.pan_x,
            "screen_y": y1 * scale + (height / 2.0) + self.pan_y,
            "scale": scale,
            "z": z2,
        }

    def fit_view(self, width, height):
        if not self.positioned_nodes:
            return

        self.pan_x = 0.0
        self.pan_y = 0.0

        best_zoom = 1540.0
        padding = 90.0

        for candidate in range(700, 2801, 40):
            self.zoom = float(candidate)
            projected = [self.project(node, width, height) for node in self.positioned_nodes]
            min_x = min(node["screen_x"] for node in projected)
            max_x = max(node["screen_x"] for node in projected)
            min_y = min(node["screen_y"] for node in projected)
            max_y = max(node["screen_y"] for node in projected)

            if (
                (max_x - min_x) <= max(120.0, width - (padding * 2.0))
                and (max_y - min_y) <= max(120.0, height - (padding * 2.0))
            ):
                best_zoom = float(candidate)

        self.zoom = best_zoom
        projected = [self.project(node, width, height) for node in self.positioned_nodes]
        min_x = min(node["screen_x"] for node in projected)
        max_x = max(node["screen_x"] for node in projected)
        min_y = min(node["screen_y"] for node in projected)
        max_y = max(node["screen_y"] for node in projected)

        target_center_x = width / 2.0
        target_center_y = (height / 2.0) - 30.0
        current_center_x = (min_x + max_x) / 2.0
        current_center_y = (min_y + max_y) / 2.0

        self.pan_x = target_center_x - current_center_x
        self.pan_y = target_center_y - current_center_y

    def refresh_layout(self):
        self.positioned_nodes = build_layout(
            self.nodes,
            self.links,
            horizontal_gap=self.horizontal_gap,
            level_height=self.level_height,
        )
        self.positioned_lookup = dict((node["id"], node) for node in self.positioned_nodes)

    def focus_nodes(self, node_ids, width, height):
        node_ids = [node_id for node_id in node_ids if node_id in self.node_lookup]
        if not node_ids:
            self.fit_view(width, height)
            return

        self.pan_x = 0.0
        self.pan_y = 0.0
        padding = 120.0
        best_zoom = 900.0

        for candidate in range(700, 2801, 40):
            self.zoom = float(candidate)
            projected = [self.project(self.positioned_lookup[node_id], width, height) for node_id in node_ids]
            min_x = min(node["screen_x"] for node in projected)
            max_x = max(node["screen_x"] for node in projected)
            min_y = min(node["screen_y"] for node in projected)
            max_y = max(node["screen_y"] for node in projected)

            if (
                (max_x - min_x) <= max(140.0, width - (padding * 2.0))
                and (max_y - min_y) <= max(140.0, height - (padding * 2.0))
            ):
                best_zoom = float(candidate)

        self.zoom = best_zoom
        projected = [self.project(self.positioned_lookup[node_id], width, height) for node_id in node_ids]
        min_x = min(node["screen_x"] for node in projected)
        max_x = max(node["screen_x"] for node in projected)
        min_y = min(node["screen_y"] for node in projected)
        max_y = max(node["screen_y"] for node in projected)
        self.pan_x = (width / 2.0) - ((min_x + max_x) / 2.0)
        self.pan_y = ((height / 2.0) - 20.0) - ((min_y + max_y) / 2.0)

    def selected_related_node_ids(self):
        if not self.selected_node_id:
            return set()

        related = set([self.selected_node_id])
        selected_path = self.node_lookup[self.selected_node_id]["path"]
        parent_path = to_posix(os.path.dirname(selected_path))

        if parent_path and parent_path in self.node_lookup:
            related.add(parent_path)

        for node in self.nodes:
            node_parent = to_posix(os.path.dirname(node["path"]))
            if node_parent == selected_path:
                related.add(node["id"])

        for link in self.links:
            if link["source"] == self.selected_node_id:
                related.add(link["target"])
            if link["target"] == self.selected_node_id:
                related.add(link["source"])

        return related

    def selected_spine_node_ids(self):
        if not self.selected_node_id:
            return set()

        spine = set()
        current_id = self.selected_node_id

        while current_id and current_id in self.node_lookup:
            spine.add(current_id)
            current_path = self.node_lookup[current_id]["path"]
            parent_path = to_posix(os.path.dirname(current_path))
            if not parent_path or parent_path == current_id or parent_path not in self.node_lookup:
                break
            current_id = parent_path

        return spine

    def load_node_text(self, node_id):
        node = self.node_lookup[node_id]
        absolute_path = os.path.join(os.path.dirname(self.root_dir), node["path"].replace("/", os.sep))

        if node["kind"] == "directory":
            readme_path = os.path.join(absolute_path, "README.md")
            if os.path.exists(readme_path):
                with open(readme_path, "r", encoding="utf-8") as handle:
                    return handle.read()
            child_names = sorted(os.listdir(absolute_path))
            return "Directory node\n\n" + "\n".join(child_names)

        if absolute_path.endswith(".md") and os.path.exists(absolute_path):
            with open(absolute_path, "r", encoding="utf-8") as handle:
                return handle.read()

        return node["path"]

    def update_nav_list(self, listbox, node_ids):
        listbox.delete(0, tk.END)
        listbox.node_ids = list(node_ids)
        for node_id in listbox.node_ids:
            node = self.node_lookup[node_id]
            listbox.insert(tk.END, node["name"])

    def update_sidebar(self):
        if not self.selected_node_id:
            return

        node = self.node_lookup[self.selected_node_id]
        self.title_var.set(node["name"])
        self.meta_var.set("%s\n%s" % (node["kind"], node["path"]))
        self.text_widget.configure(state="normal")
        self.text_widget.delete("1.0", tk.END)
        self.text_widget.insert("1.0", self.load_node_text(self.selected_node_id))
        self.text_widget.configure(state="disabled")

        selected_path = node["path"]
        parent_path = to_posix(os.path.dirname(selected_path))
        parent_ids = [parent_path] if parent_path in self.node_lookup else []
        child_ids = sorted(
            [entry["id"] for entry in self.nodes if to_posix(os.path.dirname(entry["path"])) == selected_path]
        )

        reference_ids = []
        for link in self.links:
            if link["source"] == self.selected_node_id:
                reference_ids.append(link["target"])
            elif link["target"] == self.selected_node_id:
                reference_ids.append(link["source"])

        deduped_reference_ids = []
        seen = set()
        for node_id in reference_ids:
            if node_id not in seen:
                seen.add(node_id)
                deduped_reference_ids.append(node_id)

        self.render_quick_access_cards([
            ("Parent", parent_ids),
            ("Children", child_ids),
            ("References", deduped_reference_ids),
        ])

    def select_node(self, node_id, focus=True):
        if not node_id or node_id not in self.node_lookup:
            return

        self.selected_node_id = node_id
        self.update_sidebar()

        if focus:
            width = max(self.canvas.winfo_width(), WINDOW_WIDTH)
            height = max(self.canvas.winfo_height(), WINDOW_HEIGHT)
            self.focus_nodes(self.selected_related_node_ids(), width, height)

    def draw_panel(self, width):
        hierarchy_count = len([link for link in self.links if link["kind"] == "hierarchy"])
        reference_count = len(self.links) - hierarchy_count

        self.canvas.create_rectangle(18, 18, 320, 136, fill=PANEL, outline="")
        self.canvas.create_text(
            36, 40, anchor="w", fill=TEXT, font=("Consolas", 18, "bold"), text="AI Context Tree Viewer"
        )
        self.canvas.create_text(
            36, 70, anchor="w", fill=TEXT, font=("Consolas", 11), text="left drag rotate   right drag pan   wheel zoom"
        )
        self.canvas.create_text(
            36,
            94,
            anchor="w",
            fill=TEXT,
            font=("Consolas", 11),
            text="nodes: %d   tree: %d   refs: %d" % (len(self.nodes), hierarchy_count, reference_count),
        )
        self.canvas.create_text(
            36, 118, anchor="w", fill=TEXT, font=("Consolas", 10), text="F = fit view   " + to_posix(self.root_dir)
        )

        legend_x = width - 300
        self.canvas.create_rectangle(legend_x, 18, width - 18, 116, fill=PANEL, outline="")
        self.canvas.create_oval(legend_x + 20, 36, legend_x + 32, 48, fill=DIR_COLOR, outline="")
        self.canvas.create_text(legend_x + 42, 42, anchor="w", fill=TEXT, font=("Consolas", 10), text="directory")
        self.canvas.create_oval(legend_x + 20, 60, legend_x + 32, 72, fill=FILE_COLOR, outline="")
        self.canvas.create_text(legend_x + 42, 66, anchor="w", fill=TEXT, font=("Consolas", 10), text="file")
        self.canvas.create_line(legend_x + 18, 88, legend_x + 34, 88, fill=HIERARCHY_COLOR, width=2)
        self.canvas.create_text(legend_x + 42, 88, anchor="w", fill=TEXT, font=("Consolas", 10), text="filesystem link")
        self.canvas.create_line(legend_x + 18, 104, legend_x + 34, 104, fill=REFERENCE_COLOR, width=2)
        self.canvas.create_text(legend_x + 42, 104, anchor="w", fill=TEXT, font=("Consolas", 10), text="markdown reference")

    def redraw(self):
        width = max(self.canvas.winfo_width(), WINDOW_WIDTH)
        height = max(self.canvas.winfo_height(), WINDOW_HEIGHT)
        self.canvas.delete("all")

        projected = [self.project(node, width, height) for node in self.positioned_nodes]
        projected.sort(key=lambda item: item["z"])
        projected_by_id = dict((item["id"], item) for item in projected)
        self.projected_by_id = projected_by_id
        related_node_ids = self.selected_related_node_ids()
        spine_node_ids = self.selected_spine_node_ids()

        for link in self.links:
            source = projected_by_id.get(link["source"])
            target = projected_by_id.get(link["target"])
            if not source or not target:
                continue

            highlighted = self.selected_node_id is None
            if not highlighted:
                if link["kind"] == "hierarchy":
                    highlighted = (
                        (link["source"] in spine_node_ids and link["target"] in spine_node_ids)
                        or (link["source"] in related_node_ids and link["target"] in related_node_ids)
                    )
                else:
                    highlighted = link["source"] in related_node_ids and link["target"] in related_node_ids
                    if not highlighted:
                        continue
            color = HIERARCHY_COLOR if link["kind"] == "hierarchy" else REFERENCE_COLOR
            if not highlighted:
                color = MUTED_LINK_COLOR
            width_value = 3 if link["kind"] == "hierarchy" and link["source"] in spine_node_ids and link["target"] in spine_node_ids else (2 if link["kind"] == "hierarchy" and highlighted else 1)
            self.canvas.create_line(
                source["screen_x"],
                source["screen_y"],
                target["screen_x"],
                target["screen_y"],
                fill=color,
                width=width_value,
                stipple="gray50" if (link["kind"] == "reference" and highlighted) else "gray75",
            )

        for node in projected:
            radius = node_radius(node)
            is_selected = node["id"] == self.selected_node_id
            is_related = node["id"] in related_node_ids
            is_spine = node["id"] in spine_node_ids
            if is_selected:
                color = SELECTED_COLOR
            elif is_spine or is_related or self.selected_node_id is None:
                color = DIR_COLOR if node["kind"] == "directory" else FILE_COLOR
            else:
                color = MUTED_DIR_COLOR if node["kind"] == "directory" else MUTED_FILE_COLOR
            self.canvas.create_oval(
                node["screen_x"] - radius,
                node["screen_y"] - radius,
                node["screen_x"] + radius,
                node["screen_y"] + radius,
                fill=color,
                outline="",
            )

            if node["scale"] > 0.72 or node["depth"] <= 1 or is_selected or is_related or is_spine:
                label_dx, label_dy = label_offset(node)
                self.canvas.create_text(
                    node["screen_x"] + radius + label_dx,
                    node["screen_y"] + label_dy,
                    anchor="w",
                    fill=TEXT if (is_selected or is_related or is_spine or self.selected_node_id is None) else "#6e879c",
                    font=("Consolas", 11 if node["depth"] <= 1 else 10, "bold" if node["depth"] <= 1 else "normal"),
                    text=node["name"],
                )

        self.draw_panel(width)
        self.root.after(16, self.redraw)

    def on_press(self, event):
        if (event.state & 0x0001) != 0:
            hit_node_id = self.hit_test_node(event.x, event.y)
            if hit_node_id:
                self.node_dragging = True
                self.drag_node_id = hit_node_id
                self.drag_moved = False
                self.last_x = event.x
                self.last_y = event.y
                return

        self.dragging = True
        self.drag_moved = False
        self.last_x = event.x
        self.last_y = event.y

    def on_drag(self, event):
        if self.node_dragging and self.drag_node_id:
            delta_x = event.x - self.last_x
            delta_y = event.y - self.last_y
            if abs(delta_x) > 2 or abs(delta_y) > 2:
                self.drag_moved = True
            self.last_x = event.x
            self.last_y = event.y

            projected = self.projected_by_id.get(self.drag_node_id)
            scale = projected["scale"] if projected else 1.0
            world_dx = delta_x / max(scale, 0.12)
            world_dy = delta_y / max(scale, 0.12)

            current_offset = self.manual_offsets.get(self.drag_node_id, {"x": 0.0, "y": 0.0, "z": 0.0})
            current_offset["x"] += world_dx
            current_offset["y"] += world_dy
            self.manual_offsets[self.drag_node_id] = current_offset
            return

        if not self.dragging:
            return

        delta_x = event.x - self.last_x
        delta_y = event.y - self.last_y
        if abs(delta_x) > 2 or abs(delta_y) > 2:
            self.drag_moved = True
        self.last_x = event.x
        self.last_y = event.y

        self.rotation_y += delta_x * 0.005
        self.rotation_x = max(-1.3, min(1.3, self.rotation_x + (delta_y * 0.005)))

    def on_release(self, event):
        if self.node_dragging:
            self.node_dragging = False
            self.drag_node_id = None
            return

        self.dragging = False
        if self.drag_moved:
            return

        closest_id = self.hit_test_node(event.x, event.y)
        if closest_id:
            self.select_node(closest_id, focus=True)

    def on_pan_press(self, event):
        self.panning = True
        self.last_x = event.x
        self.last_y = event.y

    def on_pan_drag(self, event):
        if not self.panning:
            return

        delta_x = event.x - self.last_x
        delta_y = event.y - self.last_y
        self.last_x = event.x
        self.last_y = event.y

        self.pan_x += delta_x
        self.pan_y += delta_y

    def on_pan_release(self, _event):
        self.panning = False

    def on_mousewheel(self, event):
        delta = 0
        if hasattr(event, "delta") and event.delta:
            delta = event.delta
        elif getattr(event, "num", None) == 4:
            delta = 120
        elif getattr(event, "num", None) == 5:
            delta = -120

        self.zoom = max(120.0, min(12000.0, self.zoom - delta * 1.6))

    def on_fit_key(self, _event):
        width = max(self.canvas.winfo_width(), WINDOW_WIDTH)
        height = max(self.canvas.winfo_height(), WINDOW_HEIGHT)
        if self.selected_node_id:
            self.focus_nodes(self.selected_related_node_ids(), width, height)
        else:
            self.fit_view(width, height)

    def on_resize(self, event):
        if event.widget != self.root:
            return

        width = max(self.canvas.winfo_width(), WINDOW_WIDTH)
        height = max(self.canvas.winfo_height(), WINDOW_HEIGHT)
        self.left_panel.place(x=18, y=height - 332, width=430, height=300)
        self.right_panel.place(x=width - 378, y=height - 332, width=360, height=300)
        if self.selected_node_id:
            self.focus_nodes(self.selected_related_node_ids(), width, height)
        else:
            self.fit_view(width, height)

    def on_quick_access_select(self, _event):
        selection = self.quick_access_list.curselection()
        if not selection:
            return

        index = selection[0]
        if 0 <= index < len(self.quick_access_node_ids):
            node_id = self.quick_access_node_ids[index]
            if node_id and index not in self.quick_access_header_rows:
                self.select_node(node_id, focus=True)

        self.quick_access_list.selection_clear(0, tk.END)

    def on_reset_drag(self, _event):
        self.manual_offsets = {}

    def on_narrower(self, _event):
        self.horizontal_gap = max(40.0, self.horizontal_gap - 12.0)
        self.refresh_layout()
        width = max(self.canvas.winfo_width(), WINDOW_WIDTH)
        height = max(self.canvas.winfo_height(), WINDOW_HEIGHT)
        if self.selected_node_id:
            self.focus_nodes(self.selected_related_node_ids(), width, height)
        else:
            self.fit_view(width, height)
        self.update_sidebar()

    def on_wider(self, _event):
        self.horizontal_gap = min(220.0, self.horizontal_gap + 12.0)
        self.refresh_layout()
        width = max(self.canvas.winfo_width(), WINDOW_WIDTH)
        height = max(self.canvas.winfo_height(), WINDOW_HEIGHT)
        if self.selected_node_id:
            self.focus_nodes(self.selected_related_node_ids(), width, height)
        else:
            self.fit_view(width, height)
        self.update_sidebar()

    def run(self):
        self.root.mainloop()


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    viewer = TreeViewer(script_dir)
    viewer.run()


if __name__ == "__main__":
    main()
